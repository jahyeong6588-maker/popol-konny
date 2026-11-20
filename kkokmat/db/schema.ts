import { sqliteTable,text,real,index,uniqueIndex } from 'drizzle-orm/sqlite-core';
export const childProfiles=sqliteTable('child_profiles',{
  ownerId:text('owner_id').primaryKey(),name:text('name').notNull(),
  height:real('height'),weight:real('weight'),measuredAt:text('measured_at'),gender:text('gender'),avatar:text('avatar_data_url'),updatedAt:text('updated_at').notNull()
});
export const children=sqliteTable('children',{
  id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),name:text('name').notNull(),
  height:real('height'),weight:real('weight'),measuredAt:text('measured_at'),gender:text('gender'),avatar:text('avatar_data_url'),updatedAt:text('updated_at').notNull()
},t=>[index('children_owner_idx').on(t.ownerId)]);
export const accountSettings=sqliteTable('account_settings',{
  ownerId:text('owner_id').primaryKey(),activeChildId:text('active_child_id')
});
export const outfits=sqliteTable('outfits',{
  id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),childId:text('child_id'),referenceKey:text('reference_key').notNull(),
  payload:text('payload').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
},t=>[index('outfits_owner_idx').on(t.ownerId),uniqueIndex('outfits_owner_reference_idx').on(t.ownerId,t.childId,t.referenceKey)]);
export const comparisons=sqliteTable('comparisons',{
  id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),childId:text('child_id'),kind:text('kind').notNull(),entryKey:text('entry_key').notNull(),
  payload:text('payload').notNull(),createdAt:text('created_at').notNull()
},t=>[index('comparisons_owner_idx').on(t.ownerId),uniqueIndex('comparisons_owner_key_idx').on(t.ownerId,t.childId,t.kind,t.entryKey)]);
