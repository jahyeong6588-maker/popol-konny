import http from 'node:http';
// Loopback proxy only; social authentication is handled by the Worker.
http.createServer((request,response)=>{
 const proxy=http.request({hostname:'127.0.0.1',port:4178,path:request.url,method:request.method,headers:request.headers},upstream=>{response.writeHead(upstream.statusCode,upstream.headers);upstream.pipe(response)});
 proxy.on('error',()=>response.writeHead(502).end('Start the Worker preview on port 4178 first.'));request.pipe(proxy);
}).listen(4180,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:4180/ (local only)'));
