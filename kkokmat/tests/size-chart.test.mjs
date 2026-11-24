import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChartText,inferChartColumn,confirmedChartRow,chartTextFromTSV} from '../public/size-chart.js';
test('size rows and transposed tables retain their own measurements',()=>{
 const a=parseChartText('사이즈\t가슴단면\t상의길이\t소매길이\n80\t25\t35\t24\n90\t27\t38\t26','top');
 assert.deepEqual(confirmedChartRow(a,1,'top'),{label:'90',values:{chestWidth:27,topLength:38,sleeveLength:26}});
 const b=parseChartText('SIZE\t80\t90\n가슴단면\t25\t27\n상의길이\t35\t38','top');assert.equal(confirmedChartRow(b,1,'top').values.topLength,38);
});
test('unit and explicit circumference conversion occur only after review; invalid OCR is rejected',()=>{
 const c=parseChartText('사이즈\t허리둘레\t바지총장\n80\t400\t450','bottom');c.unit='mm';assert.deepEqual(confirmedChartRow(c,0,'bottom').values,{waistWidth:20,pantsLength:45});
 c.rows[0].values[0]='2/';assert.throws(()=>confirmedChartRow(c,0,'bottom'),/숫자/);c.rows[0].values[0]='';assert.throws(()=>confirmedChartRow(c,0,'bottom'),/2곳/);
 assert.equal(inferChartColumn('총장','homewear-set').field,'');assert.equal(inferChartColumn('가슴','top').field,'');
 assert.equal(inferChartColumn('등 중심~소매 길이','top').field,'backNeckSleeveLength');assert.equal(inferChartColumn('인심','bottom').field,'inseam');
});
test('duplicate measurement mappings cannot overwrite one another',()=>{
 const c=parseChartText('size\t가슴단면\t가슴너비\n80\t25\t30','top');assert.throws(()=>confirmedChartRow(c,0,'top'),/두 번/);
});
test('TSV coordinates keep an unrecognized middle cell empty',()=>{
 const word=(x,y,text)=>`5\t1\t1\t1\t1\t1\t${x}\t${y}\t20\t20\t90\t${text}`;
 const tsv='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n'+[word(0,0,'사이즈'),word(100,0,'가슴단면'),word(200,0,'상의길이'),word(300,0,'소매길이'),word(0,40,'80'),word(100,40,'25'),word(200,40,'35'),word(300,40,'24'),word(0,80,'90'),word(100,80,'27'),word(300,80,'26')].join('\n');
 const c=parseChartText(chartTextFromTSV(tsv),'top');assert.deepEqual(c.rows[1].values,['27','','26']);assert.ok(!('topLength' in confirmedChartRow(c,1,'top').values));
});
