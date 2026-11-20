const fields='id,name,height,weight,measured_at AS measuredAt,gender,avatar_data_url AS avatar,updated_at AS updatedAt';
export async function childrenFor(db,owner){
 let rows=(await db.prepare(`SELECT ${fields} FROM children WHERE owner_id=? ORDER BY rowid`).bind(owner).all()).results;
 if(!rows.length){
  // Bounded, idempotent data migration for this authenticated owner. No DDL in requests.
  const legacy=await db.prepare('SELECT owner_id FROM child_profiles WHERE owner_id=?').bind(owner).first();
  if(legacy){const raw=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(owner));const id='legacy-'+Array.from(new Uint8Array(raw),v=>v.toString(16).padStart(2,'0')).join('').slice(0,32);
   await db.batch([db.prepare('INSERT OR IGNORE INTO children(id,owner_id,name,height,weight,measured_at,gender,avatar_data_url,updated_at) SELECT ?,owner_id,name,height,weight,measured_at,gender,avatar_data_url,updated_at FROM child_profiles WHERE owner_id=?').bind(id,owner),db.prepare('INSERT OR IGNORE INTO account_settings(owner_id,active_child_id) VALUES(?,?)').bind(owner,id),db.prepare('UPDATE outfits SET child_id=? WHERE owner_id=? AND child_id IS NULL').bind(id,owner),db.prepare('UPDATE comparisons SET child_id=? WHERE owner_id=? AND child_id IS NULL').bind(id,owner)]);
   rows=(await db.prepare(`SELECT ${fields} FROM children WHERE owner_id=? ORDER BY rowid`).bind(owner).all()).results;
  }
 }
 return rows;
}
export async function selectedChild(db,owner,rows,requested){
 const active=await db.prepare('SELECT active_child_id FROM account_settings WHERE owner_id=?').bind(owner).first('active_child_id');
 return rows.find(p=>p.id===(requested||active))??(requested?null:rows[0]??null);
}
export function childInsert(db,owner,id,p,now){return db.prepare('INSERT INTO children(id,owner_id,name,height,weight,measured_at,gender,avatar_data_url,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,owner,p.name,p.height,p.weight,p.measuredAt,p.gender,p.avatar,now);}
export function childUpdate(db,owner,id,p,now){return db.prepare('UPDATE children SET name=?,height=?,weight=?,measured_at=?,gender=?,avatar_data_url=?,updated_at=? WHERE owner_id=? AND id=?').bind(p.name,p.height,p.weight,p.measuredAt,p.gender,p.avatar,now,owner,id);}
export function childSelect(db,owner,id){return db.prepare('INSERT INTO account_settings(owner_id,active_child_id) VALUES(?,?) ON CONFLICT(owner_id) DO UPDATE SET active_child_id=excluded.active_child_id').bind(owner,id);}
