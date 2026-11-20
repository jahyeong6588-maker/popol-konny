export async function prepareProfilePhoto(file){
 if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type)||file.size>8*1024*1024)throw Error('8MB 이하 JPG·PNG·WebP 사진을 선택해 주세요.');
 let image;try{image=await createImageBitmap(file)}catch{throw Error('사진을 읽지 못했어요. JPG나 PNG 파일로 다시 선택해 주세요.')}
 try{const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,256,256);const side=Math.min(image.width,image.height);ctx.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,256,256);for(const quality of [.82,.65,.45,.25]){const url=canvas.toDataURL('image/jpeg',quality);if(url.length<=48000)return url}throw Error('사진을 줄이지 못했어요. 다른 사진을 선택해 주세요.')}finally{image.close()}
}
