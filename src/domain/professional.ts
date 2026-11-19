import {requireValue as need,canonical} from '../../vendor/project-store.ts';
import {artifact,hash,escapeHTML as esc,htmlPage} from './artifact.ts';
import {sourceText} from './text.ts';
import {parseLyrics,parseLRC,formatTime} from './formats.ts';
import {lyricDigest,lineDigest,takeDigest,checkLyrics,rhymeReport,songSheet,performedLines,taggedLyrics,markStatus,sectionNames} from './lyrics.ts';
import {loadTake} from './audio.ts';
export {validateDomain} from './lyrics.ts';
export {checkSources} from './audio.ts';
export function validateTransition(next:any,prev:any,_action?:string){if(!prev)return;for(const old of prev.takes){const t=next.takes.find((x:any)=>x.id===old.id);if(t)need(t.asset_source_index===old.asset_source_index&&t.lyric_sha256===old.lyric_sha256,"录音身份与录制歌词摘要不可重定向，请建立新Take保留原版。");}for(const old of prev.imports){need(next.imports.some((i:any)=>i.id===old.id&&canonical(i)===canonical(old)),'LRC原件不可删除或修改，请追加新的导入记录。');}}
export async function pureAction(a:string,i:any){if(a==='preview_lrc')return parseLRC(i.content);}
export async function writeProfessional(a:string,p:any,s:any[],i:any,request:any){
 if(a==='apply_variant'){const v=p.variants.find((v:any)=>v.id===i.variant_id);need(v,'备选不存在。');const l=p.lines.find((l:any)=>l.id===v.line_id);need(lineDigest(l)===v.line_sha256,'备选依据已经变化，请先复核原句。','hetu.stale_evidence');l.text=v.text;l.pronunciation=null;l.rhyme_key=null;l.syllables=null;return;}
 if(a==='import_lyrics'){const v=parseLyrics(sourceText(s[i.source_index]),i.source_index,i.id_prefix);need(!v.diagnostics.some(x=>x.blocking)&&v.sections.length,'标记歌词仍有阻塞或缺少明确段落。');for(const k of ['sections','lines','arrangement']){const rows=(v as any)[k];need(!rows.some((x:any)=>p[k].some((old:any)=>old.id===x.id)),'导入ID已存在，请核对原操作。');const order=k==='lines'?0:Math.max(0,...p[k].map((x:any)=>x.order));p[k].push(...rows.map((x:any)=>({...x,...(k==='lines'?{}:{order:x.order+order})})));}return;}
 if(a==='import_lrc'){need(!p.imports.some((x:any)=>x.id===i.import_id),'导入ID已存在。');const v=parseLRC(i.content),audio=await loadTake(p,s,i.take_id,request);need(v.diagnostics.length===0,'LRC包含未识别原文，请先明确处理转换损失。');need(audio.take.lyric_sha256===lyricDigest(p),'录音关联旧歌词，请重新核对后建立明确的新录音声明。','hetu.stale_evidence');const expected=performedLines(p);need(expected.length>0&&v.entries.length===expected.length&&v.entries.every((e:any,n:number)=>e.text===expected[n].text),'LRC与当前演唱编排逐句不一致。');need(!p.marks.some((m:any)=>m.take_id===i.take_id),'录音已有标记，请先显式移除旧映射或使用新录音。');p.marks.push(...v.entries.map((e:any,n:number)=>({id:i.import_id+'-'+(n+1),take_id:i.take_id,...expected[n],start_ms:e.start_ms,end_ms:n+1<v.entries.length?v.entries[n+1].start_ms:Math.floor(audio.meta.duration_ms)})));p.imports.push({id:i.import_id,take_id:i.take_id,source_text:i.content,sha256:v.sha256,offset_ms:v.offset_ms});return;}
 throw Error('未知专业写动作。');
}
export function summaries(p:any){return [{title:'创作目标',lines:[p.brief]},{title:'歌词',lines:[taggedLyrics(p)]},{title:'逐句备选',lines:p.variants.map((v:any)=>v.text+'：'+v.rationale)},{title:'意见',lines:p.notes.map((n:any)=>n.comment+(n.resolution?'；'+n.resolution:''))}];}
export function reviewHTML(p:any){return htmlPage(p.title,'<h1>'+esc(p.title)+'</h1><p>'+esc(p.brief)+'</p>'+songSheet(p).map(s=>'<section><h2>'+esc(s.section.title)+'</h2>'+s.lines.map((l:any)=>'<p>'+esc(l.text)+'</p>').join('')+'</section>').join('')+'<h2>明确约束</h2><table><tr><th>歌词</th><th>字数</th><th>声明读音</th><th>韵尾</th></tr>'+rhymeReport(p).lines.map((l:any)=>'<tr><td>'+esc(l.text)+'</td><td>'+l.units+'</td><td>'+esc(l.pronunciation??'未知')+'</td><td>'+esc(l.rhyme_key??'未知')+'</td></tr>').join('')+'</table><h2>实际录音与对齐</h2>'+p.takes.map((t:any)=>'<section><h3>'+esc(t.title)+'</h3><p>'+esc(t.notes)+'</p><p>'+(t.lyric_sha256===lyricDigest(p)?'当前歌词录音声明':'旧歌词录音，须复核')+'</p>'+p.marks.filter((m:any)=>m.take_id===t.id).map((m:any)=>'<p>'+formatTime(m.start_ms)+' '+esc(m.text)+'</p>').join('')+'</section>').join('')+'<h2>备选与意见</h2>'+p.variants.map((v:any)=>'<p>'+esc(v.text)+'：'+esc(v.rationale)+'</p>').join('')+p.notes.map((n:any)=>'<p>'+esc(n.comment)+' '+esc(n.resolution)+'</p>').join('')+'<p>固定专业审核本，不嵌入音频、外部脚本或完整原著；可播放与作者认可分别判断。</p>');}
export async function readProfessional(a:string,p:any,s:any[],i:any,request:any):Promise<any>{
 if(a==='check_lyrics')return checkLyrics(p);
 if(a==='rhyme_report')return rhymeReport(p);
 if(a==='song_sheet')return {sections:songSheet(p),note:'同一副歌的每次出场独立标识，歌词修改会影响所有引用该段落的出场。'};
 if(a==='lyric_digest')return {lyric_sha256:lyricDigest(p)};
 if(a==='line_digest'){const l=p.lines.find((l:any)=>l.id===i.line_id);need(l,'歌词句不存在。');return {line:l,line_sha256:lineDigest(l)};}
 if(a==='take_digest'){need(p.takes.some((t:any)=>t.id===i.take_id),'录音不存在。');return {take_sha256:takeDigest(p,i.take_id)};}
 if(a==='preview_lyrics')return parseLyrics(sourceText(s[i.source_index]),i.source_index);
 if(a==='export_lyrics')return artifact(taggedLyrics(p),'歌词.txt','text/plain',i);
 if(a==='export_review')return artifact(reviewHTML(p),'歌词审核本.html','text/html',i);
 if(['inspect_take','read_take','locate_audio','export_lrc','audio_handoff'].includes(a)){
  const audio=await loadTake(p,s,i.take_id,request),status=markStatus(p,i.take_id);
  if(a==='inspect_take')return {...audio.meta,source_ref:audio.source_ref,alignment:status};
  if(a==='read_take')return {...artifact(audio.bytes,'固定录音.wav','audio/wav',i),source_ref:audio.source_ref};
  if(a==='locate_audio')return {time_ms:i.time_ms,marks:status.marks.filter((m:any)=>m.start_ms<=i.time_ms&&i.time_ms<m.end_ms),stale_take:status.stale_take,stale_mark_ids:status.stale_mark_ids};
  if(a==='export_lrc'){need(!status.stale_take&&!status.stale_mark_ids.length&&!status.missing.length&&status.order_matches,'LRC不是当前完整有效对齐，请复核歌词、录音与每次出场。','hetu.stale_evidence');return {...artifact('[ti:'+p.title.replace(/[\r\n\[\]]/g,'')+']\n[offset:0]\n'+status.marks.map((m:any)=>formatTime(m.start_ms)+m.text).join('\n')+'\n','逐句歌词.lrc','text/plain',i),losses:['LRC不保留结束时间、专业ID、来源与意见；完整工程请另导出JSON。']};}
  if(a==='audio_handoff')return {target:i.target,take:audio.take,source_ref:audio.source_ref,actual_audio:audio.meta,lyrics:taggedLyrics(p),marks:status.marks,stale_take:status.stale_take,stale_mark_ids:status.stale_mark_ids,note:'下游须发现自身Skill与Schema，音频通过同作品固定asset引用接续；录音、正式选用、混音和成片认可分别决定。'};
 }
}
