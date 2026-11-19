import {requireValue as need} from '../../vendor/project-store.ts';
import {hash} from './artifact.ts';
export function parseLyrics(text:string,source_index:number,prefix='lyric'){
 const rows=text.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g)??[];let byte=0,current:any;const sections:any[]=[],lines:any[]=[],arrangement:any[]=[],diagnostics:any[]=[];
 const kinds:Record<string,string>={'verse':'verse','主歌':'verse','chorus':'chorus','副歌':'chorus','pre-chorus':'pre_chorus','预副歌':'pre_chorus','bridge':'bridge','桥段':'bridge','intro':'intro','前奏':'intro','outro':'outro','尾声':'outro','instrumental':'instrumental','器乐':'instrumental'};
 for(const row of rows){if(!row)continue;const raw=row.replace(/[\r\n]+$/,''),t=raw.replace(/^\uFEFF/,'').trim();const start=byte;byte+=Buffer.byteLength(row);if(!t)continue;
  const match=/^\[([^\]\r\n]+)\]$/.exec(t);
  if(match){const key=match[1].toLowerCase(),kind=kinds[key]??'other';current={id:prefix+'-section-'+(sections.length+1),title:match[1],kind,order:sections.length+1};sections.push(current);arrangement.push({id:prefix+'-occurrence-'+sections.length,section_id:current.id,order:sections.length});if(kind==='other')diagnostics.push({line:sections.length,message:'未识别段落标签按其他保留：'+match[1]});}
  else if(t.startsWith('[')||t.endsWith(']'))diagnostics.push({message:'结构标签未闭合或混入歌词：'+t,blocking:true});
  else if(!current)diagnostics.push({message:'歌词位于首个明确段落之前：'+t,blocking:true});
  else lines.push({id:prefix+'-line-'+(lines.length+1),section_id:current.id,order:lines.filter(l=>l.section_id===current.id).length+1,text:t,pronunciation:null,rhyme_group:null,rhyme_key:null,syllables:null,min_units:null,max_units:null,ranges:[{source_index,byte_start:start,byte_end:start+Buffer.byteLength(raw),quote:raw}]});
 }
 return {sections,lines,arrangement,diagnostics,source_sha256:hash(text),note:'标签只用于保留结构，未知按其他保留；不自动补曲式、发音或音节。'};
}
export function parseLRC(text:string){
 need(Buffer.byteLength(text)<=65536,'LRC超过64KiB。');let offset=0;const metadata:Record<string,string>={},entries:any[]=[],diagnostics:string[]=[];const rows=text.replace(/^\uFEFF/,'').split(/\r\n|\n|\r/);
 for(const [n,row] of rows.entries()){if(!row.trim())continue;const meta=/^\[([A-Za-z]+):([^\]]*)\]$/.exec(row.trim());if(meta){const [,k,v]=meta;if(k==='offset'){need(/^-?\d+$/.test(v),'LRC offset无效。');need(!('offset' in metadata),'LRC offset重复。');offset=Number(v);need(Number.isSafeInteger(offset)&&Math.abs(offset)<=1800000,'LRC offset越界。');}metadata[k]=v;continue;}
  need(!/<\d+:\d+/.test(row),'不支持增强逐词LRC，请先显式转换并保留原件。');let rest=row;const times:number[]=[];
  while(true){const m=/^\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/.exec(rest);if(!m)break;need(Number(m[2])<60,'LRC秒数须小于60。');times.push(Number(m[1])*60000+Number(m[2])*1000+Number((m[3]??'').padEnd(3,'0')));rest=rest.slice(m[0].length);}
  if(!times.length){diagnostics.push('第'+(n+1)+'行不是支持的时间或元数据格式');continue;}need(rest.trim(),'LRC空歌词不能自动映射，请保留原件后显式整理。');for(const time of times)entries.push({start_ms:time,text:rest.trim(),source_line:n+1});
 }
 for(const e of entries){e.start_ms-=offset;need(e.start_ms>=0&&e.start_ms<=1800000,'LRC offset产生负时间或超时。');}
 entries.sort((a,b)=>a.start_ms-b.start_ms);need(new Set(entries.map(e=>e.start_ms)).size===entries.length,'LRC重复起始时间，不能猜测翻译或合唱关系。');
 return {entries,metadata,offset_ms:offset,diagnostics,sha256:hash(text),losses:['LRC只声明逐句起始时间；不含结束时间、稳定ID、来源和意见。','正offset提前显示，effective_ms=tag_ms-offset_ms；原件完整保留。']};
}
export function formatTime(ms:number){const min=Math.floor(ms/60000),sec=Math.floor(ms/1000)%60,f=ms%1000;return '['+String(min).padStart(2,'0')+':'+String(sec).padStart(2,'0')+'.'+String(f).padStart(3,'0')+']';}
