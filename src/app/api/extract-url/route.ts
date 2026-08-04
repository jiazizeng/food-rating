import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: '请提供有效的URL' }, { status: 400 });
    }

    // === Robust URL extraction from mixed text ===
    // Users often paste text like "【海底捞】人均150... https://m.dianping.com/xxx"
    // We need to extract the URL from any surrounding text

    const inputText = url.trim();

    // Known URL shorteners and platform domains
    const knownDomains = [
      'dianping.com', 'meituan.com', 'amap.com', 'gaode.com',
      'ele.me', 'dpurl.cn', 'meituan.net',
    ];

    // Pattern 1: Extract full https?:// URL from text
    const webUrlMatch = inputText.match(/https?:\/\/[^\s一-鿿　-〿＀-￯]*[^\s一-鿿　-〿＀-￯。，！？、；：""''）】》)]/);
    let rawUrl = webUrlMatch ? webUrlMatch[0] : '';

    // Pattern 2: Extract app deep-link URL from text
    if (!rawUrl) {
      const schemeMatch = inputText.match(/(?:dianping|imeituan|gaode|iosamap|androidamap):\/\/[^\s一-鿿]*[^\s一-鿿。，！？、；：""''）】》)]/);
      rawUrl = schemeMatch ? schemeMatch[0] : '';
    }

    // Pattern 3: If all else fails, try the whole input as URL (strip Chinese text)
    if (!rawUrl) {
      // Take the last "word" that looks like a URL fragment
      const words = inputText.split(/\s+/);
      for (let i = words.length - 1; i >= 0; i--) {
        const w = words[i].trim();
        if (/^(https?:\/\/|dianping:\/\/|imeituan:\/\/|gaode:\/\/|iosamap:\/\/|androidamap:\/\/)/.test(w)) {
          rawUrl = w;
          break;
        }
        // Short link patterns like dpurl.cn/xxxx
        if (/^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}\/\S+/.test(w) &&
            knownDomains.some(d => w.includes(d))) {
          rawUrl = (w.startsWith('http') ? '' : 'https://') + w;
          break;
        }
      }
    }

    if (!rawUrl) {
      return NextResponse.json({
        error: '未在文本中找到有效链接。支持：美团、大众点评、高德地图的分享链接。请确认复制内容包含完整URL。',
      }, { status: 400 });
    }

    // Clean extracted URL
    rawUrl = rawUrl.trim();
    // Strip trailing punctuation that isn't part of URL
    rawUrl = rawUrl.replace(/[,，。！？、；：'"）】》）]+$/, '');

    // Convert app deep-link schemes to https
    const schemeMap: Record<string, string> = {
      'dianping://': 'https://www.dianping.com/',
      'imeituan://': 'https://www.meituan.com/',
      'gaode://': 'https://www.amap.com/',
      'iosamap://': 'https://www.amap.com/',
      'androidamap://': 'https://www.amap.com/',
    };
    for (const [scheme, base] of Object.entries(schemeMap)) {
      if (rawUrl.startsWith(scheme)) {
        rawUrl = base + rawUrl.slice(scheme.length).replace(/^\/+/, '');
        break;
      }
    }

    // Ensure https:// prefix for bare domain URLs
    if (!/^https?:\/\//.test(rawUrl)) {
      rawUrl = 'https://' + rawUrl;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      // Try encoding non-ASCII characters
      try {
        const encoded = rawUrl.replace(/[^\x00-\x7F]+/g, (chunk: string) => encodeURIComponent(chunk));
        parsedUrl = new URL(encoded);
      } catch {
        return NextResponse.json({
          error: '无法解析链接，请确认复制的是完整的网页地址（非小程序链接）',
        }, { status: 400 });
      }
    }

    // Fetch the page server-side
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: `无法访问该页面 (HTTP ${response.status})` }, { status: 502 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const result: Record<string, string | null> = {};

    // Helper to safely get attribute or null
    const a = ($el: cheerio.Cheerio<any>, attr: string): string | null =>
      $el.attr(attr) || null;
    const t = ($el: cheerio.Cheerio<any>): string | null =>
      $el.text()?.trim() || null;

    // 1. JSON-LD structured data (highest priority)
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).text() || '{}');
        const schemas = Array.isArray(json) ? json : [json];
        for (const schema of schemas) {
          const type = schema['@type'];
          if (type === 'Restaurant' || type === 'FoodEstablishment' || type === 'LocalBusiness') {
            result.name = result.name || schema.name || null;
            if (schema.address) {
              result.address = result.address ||
                (typeof schema.address === 'string' ? schema.address : schema.address.streetAddress) || null;
              if (typeof schema.address === 'object') {
                result.city = result.city || schema.address.addressLocality || null;
              }
            }
            result.phone = result.phone || schema.telephone || null;
            result.website = result.website || schema.url || null;
            result.cuisine = result.cuisine || schema.servesCuisine || null;
            if (schema.priceRange) result.price_range = result.price_range || schema.priceRange || null;
            if (schema.geo) {
              result.latitude = result.latitude || String(schema.geo.latitude) || null;
              result.longitude = result.longitude || String(schema.geo.longitude) || null;
            }
            if (schema.openingHours) result.business_hours = result.business_hours || schema.openingHours || null;
          }
        }
      } catch { /* skip invalid JSON */ }
    });

    // 2. Open Graph / Meta tags
    result.name = result.name ||
      a($('meta[property="og:title"]'), 'content') ||
      a($('meta[name="twitter:title"]'), 'content') ||
      t($('title'));

    result.description = result.description ||
      a($('meta[property="og:description"]'), 'content') ||
      a($('meta[name="description"]'), 'content') ||
      a($('meta[name="twitter:description"]'), 'content');

    result.address = result.address ||
      a($('meta[property="business:contact_data:street_address"]'), 'content') ||
      a($('meta[itemprop="streetAddress"]'), 'content');

    result.city = result.city ||
      a($('meta[property="business:contact_data:locality"]'), 'content') ||
      a($('meta[itemprop="addressLocality"]'), 'content');

    result.phone = result.phone ||
      a($('meta[property="business:contact_data:phone_number"]'), 'content') ||
      a($('meta[itemprop="telephone"]'), 'content');

    // 3. Platform-specific extraction
    const hostname = parsedUrl.hostname;

    if (hostname.includes('dianping.com') || hostname.includes('meituan.com')) {
      result.name = result.name?.replace(/[-–—|｜].*$/, '').trim() || null;

      const avgPriceEl = $('[class*="price"], [class*="avgPrice"], [class*="人均"], [class*="J_price"]').first();
      if (avgPriceEl.length) {
        const priceMatch = avgPriceEl.text().match(/[¥￥]?\s*(\d+)\s*\/?\s*人/);
        if (priceMatch) result.avg_price = priceMatch[1];
      }

      const addrEl = $('[class*="address"], [class*="addr"], [class*="info-addr"], [class*="J_address"]').first();
      if (addrEl.length && !result.address) {
        result.address = addrEl.text().trim() || null;
      }
    }

    if (hostname.includes('amap.com') || hostname.includes('gaode.com')) {
      const titleText = $('title').text() || '';
      const nameMatch = titleText.match(/^(.+?)[-–—|｜]/);
      if (nameMatch) result.name = result.name || nameMatch[1].trim() || null;

      const addrEl = $('[class*="address"], [class*="detail-address"]').first();
      if (addrEl.length && !result.address) {
        result.address = addrEl.text().trim() || null;
      }
    }

    // 4. Clean up
    for (const key of Object.keys(result)) {
      const val = result[key];
      if (val && val.length > 500) result[key] = val.slice(0, 500) + '...';
      if (!val) delete result[key];
    }

    // 5. Source hint
    const sourceHint = (() => {
      if (hostname.includes('dianping.com')) return '大众点评';
      if (hostname.includes('meituan.com')) return '美团';
      if (hostname.includes('amap.com') || hostname.includes('gaode.com')) return '高德地图';
      if (hostname.includes('ele.me')) return '饿了么';
      return hostname;
    })();

    return NextResponse.json({ success: true, source: sourceHint, data: result });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return NextResponse.json({ error: '页面加载超时，请检查链接或稍后重试' }, { status: 504 });
    }
    return NextResponse.json({ error: '解析失败: ' + (err.message || '未知错误') }, { status: 500 });
  }
}
