export const SEASONS={any:'상관없어요',all:'4계절용',spring:'봄',summer:'여름',autumn:'가을',winter:'겨울'};
export const FABRICS={cotton:'면',modal:'모달','cotton+modal':'면·모달',bamboo:'밤부',polyester:'폴리에스터',rayon:'레이온',wool:'울',linen:'린넨',acrylic:'아크릴'};

export function fabricProfile(product,override=''){
 const fibers=override?override.split('+'):(product?.attributes?.fibers??[]);
 return {fibers:[...new Set(fibers)].sort(),weave:override?'':product?.attributes?.weave??''};
}
export function hasDifferentFabric(reference,candidate){
 if(!reference.fibers.length||!candidate.fibers.length)return false;
 return reference.fibers.join('+')!==candidate.fibers.join('+')||!!(reference.weave&&candidate.weave&&reference.weave!==candidate.weave);
}
export function matchesSeason(product,season='any'){
 if(season==='any')return true;
 const seasons=product?.attributes?.seasons??[];
 return seasons.includes(season)||(season!=='all'&&seasons.includes('all'));
}
export function keywordBadge(product,season='any'){
 const features=product?.attributes?.features??[];
 const order=season==='summer'?['cool','light','soft','domestic','brushed']:season==='winter'?['brushed','soft','domestic','light','cool']:['brushed','cool','light','soft','domestic'];
 for(const key of order){const feature=features.find(f=>f.key===key);if(feature)return feature;}
 return {key:'unknown',label:'특징 확인 중',evidence:'공식 상품 정보에서 특징을 확인하지 못했어요.'};
}
