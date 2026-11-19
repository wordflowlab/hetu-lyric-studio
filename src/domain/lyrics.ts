import {requireValue as need,canonical} from '../../vendor/project-store.ts';
import {hash} from './artifact.ts';
export const sectionNames:Record<string,string>={intro:'前奏',verse:'主歌',pre_chorus:'预副歌',chorus:'副歌',bridge:'桥段',instrumental:'器乐',outro:'尾声',other:'其他'};
export const lineDigest=(l:any)=>hash(canonical(l));
export const lyricDigest=(p:any)=>hash(canonical({language_tag:p.language_tag,sections:p.sections,lines:p.lines,arrangement:p.arrangement}));
export const takeDigest=(p:any,id:string)=>hash(canonical({take:p.takes.find((x:any)=>x.id===id),marks:p.marks.filter((x:any)=>x.take_id===id)}));
export function songSheet(p:any){return [...p.arrangement].sort((a,b)=>a.order-b.order).map(o=>({occurrence:o,section:p.sections.find((s:any)=>s.id===o.section_id),lines:p.lines.filter((l:any)=>l.section_id===o.section_id).sort((a:any,b:any)=>a.order-b.order)}));}
export function performedLines(p:any){return songSheet(p).flatMap(s=>s.lines.map((l:any)=>({occurrence_id:s.occurrence.id,line_id:l.id,text:l.text,line_sha256:lineDigest(l)})));}
export function validateDomain(p:any){
 const ids=(a:any[])=>new Set(a.map(x=>x.id)),sections=ids(p.sections),lines=ids(p.lines),occ=ids(p.arrangement),takes=ids(p.takes);
 const unique=(v:any[],message:string)=>need(new Set(v).size===v.length,message);
 unique(p.sections.map((s:any)=>s.order),'段落顺序重复。');unique(p.arrangement.map((s:any)=>s.order),'出场顺序重复。');
 for(const l of p.lines){need(sections.has(l.section_id),'歌词段落不存在。');need(l.text.trim(),'歌词不能为空白。');need(!/[\r\n]/.test(l.text),'一句歌词不能包含换行。');need(l.min_units===null||l.max_units===null||l.min_units<=l.max_units,'歌词长度上下界倒置。');need(l.rhyme_key===null||l.pronunciation!==null,'韵尾标注须附明确读音依据。');}
 for(const s of p.sections)unique(p.lines.filter((l:any)=>l.section_id===s.id).map((l:any)=>l.order),'同段歌词顺序重复。');
 for(const o of p.arrangement)need(sections.has(o.section_id),'编排引用段落不存在。');
 for(const v of p.variants)need(lines.has(v.line_id),'备选原句不存在。');
 for(const t of p.takes)need(t.title.trim(),'录音标题不能为空。');
 for(const m of p.marks){need(takes.has(m.take_id)&&occ.has(m.occurrence_id)&&lines.has(m.line_id),'录音标记引用不存在。');need(p.arrangement.find((o:any)=>o.id===m.occurrence_id).section_id===p.lines.find((l:any)=>l.id===m.line_id).section_id,'歌词与段落出场不匹配。');need(m.end_ms>m.start_ms,'逐句时间区间无效。');}
 for(const t of p.takes){const marks=p.marks.filter((m:any)=>m.take_id===t.id).sort((a:any,b:any)=>a.start_ms-b.start_ms);unique(marks.map((m:any)=>canonical([m.occurrence_id,m.line_id])),'同录音同句出场重复标记。');for(let n=1;n<marks.length;n++)need(marks[n].start_ms>=marks[n-1].end_ms,'同录音歌词时间重叠。');}
 for(const n of p.notes){need((n.target_kind==='line'?lines:takes).has(n.target_id),'意见目标不存在。');need(n.status!=='resolved'||n.resolution.trim(),'解决意见须有说明。');}
 for(const i of p.imports){need(takes.has(i.take_id),'LRC原件录音不存在。');need(hash(i.source_text)===i.sha256,'LRC原文摘要不一致。');}
}
export function rhymeReport(p:any){
 const lines=p.lines.map((l:any)=>{const units=(l.text.match(/[\p{L}\p{N}]/gu)??[]).length;const words=(l.text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)??[]).length;return {...l,units,english_words:words,length_ok:(l.min_units===null||units>=l.min_units)&&(l.max_units===null||units<=l.max_units),syllables_status:l.syllables===null?'unknown':'declared'};});
 const groups=[...new Set(p.lines.map((l:any)=>l.rhyme_group).filter(Boolean))].map(group=>{const ls=lines.filter((l:any)=>l.rhyme_group===group),known=ls.filter((l:any)=>l.rhyme_key!==null);return {group,lines:ls.map((l:any)=>({id:l.id,text:l.text,pronunciation:l.pronunciation,rhyme_key:l.rhyme_key})),unknown_line_ids:ls.filter((l:any)=>l.rhyme_key===null).map((l:any)=>l.id),status:known.length!==ls.length?'unknown':new Set(known.map((l:any)=>l.rhyme_key)).size===1?'declared_match':'declared_conflict'};});
 return {lines,groups,note:'字数仅统计Unicode字母和数字，英文词数单列，不等于音节；韵尾按明确读音声明比较，不自动认证听觉押韵。'};
}
export function markStatus(p:any,take_id:string){const expected=performedLines(p),take=p.takes.find((t:any)=>t.id===take_id);need(take,'录音不存在。');const marks=p.marks.filter((m:any)=>m.take_id===take_id).sort((a:any,b:any)=>a.start_ms-b.start_ms);return {take,marks,stale_take:take.lyric_sha256!==lyricDigest(p),stale_mark_ids:marks.filter((m:any)=>{const l=p.lines.find((l:any)=>l.id===m.line_id);return m.line_sha256!==lineDigest(l)||m.text!==l.text;}).map((m:any)=>m.id),missing:expected.filter(e=>!marks.some((m:any)=>m.occurrence_id===e.occurrence_id&&m.line_id===e.line_id)),order_matches:marks.length===expected.length&&marks.every((m:any,n:number)=>m.occurrence_id===expected[n].occurrence_id&&m.line_id===expected[n].line_id)};}
export function checkLyrics(p:any){const report=rhymeReport(p);return {section_count:p.sections.length,line_count:p.lines.length,performed_line_count:performedLines(p).length,unperformed_section_ids:p.sections.filter((s:any)=>!p.arrangement.some((o:any)=>o.section_id===s.id)).map((s:any)=>s.id),empty_vocal_sections:p.sections.filter((s:any)=>!['intro','instrumental','outro'].includes(s.kind)&&!p.lines.some((l:any)=>l.section_id===s.id)).map((s:any)=>s.id),length_issues:report.lines.filter((l:any)=>!l.length_ok).map((l:any)=>({line_id:l.id,text:l.text,units:l.units})),unknown_syllable_ids:p.lines.filter((l:any)=>l.syllables===null).map((l:any)=>l.id),rhyme_groups:report.groups,stale_variant_ids:p.variants.filter((v:any)=>v.line_sha256!==lineDigest(p.lines.find((l:any)=>l.id===v.line_id))).map((v:any)=>v.id),takes:p.takes.map((t:any)=>markStatus(p,t.id)),stale_note_ids:p.notes.filter((n:any)=>n.target_sha256!==(n.target_kind==='line'?lineDigest(p.lines.find((l:any)=>l.id===n.target_id)):takeDigest(p,n.target_id))).map((n:any)=>n.id),note:'结构检查、声明标注、实际听取和作者认可分别判断；缺少专业语义仍需Agent复读。'};}
export function taggedLyrics(p:any){return songSheet(p).map(s=>'['+s.section.title+']\n'+s.lines.map((l:any)=>l.text).join('\n')).join('\n\n')+'\n';}
