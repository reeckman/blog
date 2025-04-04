// functions/dns-query.js

/**
 * 处理 DoH (DNS over HTTPS) 请求的 Cloudflare Function
 * @param {EventContext} context 包含请求、环境变数等信息
 */
export async function onRequest(context) {
  const { request, env } = context;

  // 1. 获取上游 DoH 服务器地址
  // 从 Cloudflare Pages 的环境变量 `UPSTREAM_DOH_SERVER` 获取
  // 如果未设置，则默认使用 Cloudflare 的 DoH 服务
  const upstreamDohServer = env.UPSTREAM_DOH_SERVER || 'https://1.1.1.1/dns-query';

  // 2. 构造转发到上游的请求
  const url = new URL(request.url);
  const upstreamUrl = new URL(upstreamDohServer);

  // 保留原始请求的路径和查询参数 (重要: GET 请求依赖查询参数)
  upstreamUrl.pathname = upstreamUrl.pathname; // 保持上游服务器配置的路径
  upstreamUrl.search = url.search; // 将客户端的查询参数 (?dns=...) 转发给上游

  // 创建新的请求头对象，并复制必要的头信息
  const headers = new Headers(request.headers);
  headers.set('Host', upstreamUrl.host); // 设置正确的主机头
  // Cloudflare 会自动处理 Accept-Encoding，无需手动设置或删除
  // Cloudflare 会自动处理 CF-* 和 X-Forwarded-* 头，无需手动处理

  // 确保 Accept 头符合 DoH 标准
  headers.set('Accept', 'application/dns-message');

  // 3. 根据原始请求方法 (GET 或 POST) 转发
  let upstreamResponse;
  try {
    if (request.method === 'GET') {
      // 对于 GET 请求，直接使用构造好的 URL 和头部发起 fetch
      upstreamResponse = await fetch(upstreamUrl.toString(), {
        method: 'GET',
        headers: headers,
        redirect: 'follow' // 跟随上游的重定向
      });
    } else if (request.method === 'POST' && request.headers.get('content-type') === 'application/dns-message') {
      // 对于 POST 请求，使用上游基础 URL，并传递原始请求体
      upstreamResponse = await fetch(upstreamUrl.toString(), {
        method: 'POST',
        headers: headers,
        body: request.body, // 直接传递请求体
        redirect: 'follow' // 跟随上游的重定向
      });
    } else {
      // 不支持的方法或 Content-Type
      return new Response('Unsupported method or content-type', { status: 405 });
    }

    // 4. 检查上游响应是否成功
    if (!upstreamResponse.ok) {
      // 如果上游服务器返回错误，将错误信息传递给客户端
      console.error(`Upstream DoH server error: ${upstreamResponse.status} ${upstreamResponse.statusText}`);
      // 可以选择返回一个更友好的错误页面或简单的错误状态
      return new Response(`Upstream DoH server error: ${upstreamResponse.status}`, { status: upstreamResponse.status });
    }

    // 5. 将上游服务器的响应返回给客户端
    // 创建新的响应头，复制上游响应的头信息
    const responseHeaders = new Headers(upstreamResponse.headers);

    // 关键：设置正确的 CORS 头，允许浏览器等客户端跨域使用
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type');
    // RFC 8484 建议缓存时间
    responseHeaders.set('Cache-Control', 'public, max-age=3600');


    // 返回包含上游响应体和处理后头部的响应
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Error fetching upstream DoH server:', error);
    return new Response('Internal Server Error while contacting upstream DoH server', { status: 502 }); // Bad Gateway
  }
}