import {createHash} from 'node:crypto';
import {newProject} from '../../src/domain/model.ts';
import {parseLyrics,formatTime} from '../../src/domain/formats.ts';
import {lineDigest,lyricDigest,performedLines,takeDigest} from '../../src/domain/lyrics.ts';
export const original='[主歌]\n旧信落在雨声里\n钥匙藏着你的名\n\n[副歌]\n让灯等到天放晴\n让风带我回雨亭\n';
export const sha=(s:string|Uint8Array)=>createHash('sha256').update(s).digest('hex');
export const sourceRef={kind:'resource',work_ref:{workspace_id:'workspace_test',kind:'novel',object_id:'novel_test'},resource_id:'resource_test',revision:1,sha256:sha(original)};
export const base=(r:any,key:string)=>({object_id:r.object.object_id,expected_revision:r.object.revision,expected_sha256:r.sha256,operation_key:key});
export const selection=(r:any)=>({object_id:r.object.object_id,revision:r.object.revision});
export function scenario(_work?:any):any{const v=parseLyrics(original,0,'song'),p={...newProject('雨港等晴'),brief:'林溪的片尾人物歌：从等信到出发，保留旧信、钥匙、雨亭和灯的意象。',sections:v.sections,lines:v.lines,arrangement:v.arrangement};p.arrangement.push({id:'repeat-chorus',section_id:p.sections[1].id,order:3});p.lines[0].min_units=8;p.lines[0].max_units=10;for(const [n,l] of p.lines.entries()){l.rhyme_group=n<2?'A':'B';l.pronunciation=['yu3 sheng1 li3','ni3 de ming2','tian1 fang4 qing2','hui2 yu3 ting2'][n];l.rhyme_key=n===0?'i':'ing';l.syllables=7;}p.variants=[{id:'variant-1',line_id:p.lines[0].id,line_sha256:lineDigest(p.lines[0]),text:'旧信轻轻落在雨声里',rationale:'补足呼吸与节奏，保留旧信意象；实际演唱后再判断。'}];p.notes=[{id:'note-1',target_kind:'line',target_id:p.lines[0].id,target_sha256:lineDigest(p.lines[0]),origin:'agent',comment:'首句短于明确约束，准备备选并实际试唱后核对。',status:'open',resolution:''}];return p;}
export function addTake(p:any,index=1){p.takes.push({id:'demo',title:'合成节拍测试音 非演唱',asset_source_index:index,lyric_sha256:lyricDigest(p),notes:'原创合成测试音，仅验证时间、波形和接续，不代表真人演唱或听审质量。'});return p;}
export function lrc(p:any){return '[ti:雨港等晴]\n[offset:0]\n'+performedLines(p).map((l:any,n:number)=>formatTime(n*500)+l.text).join('\n')+'\n';}
export function wav(frames=32000,rate=8000){const b=Buffer.alloc(44+frames*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(frames*2,40);for(let n=0;n<frames;n++)b.writeInt16LE(Math.round(Math.sin(2*Math.PI*220*n/rate)*5000*(n%4000<1000?1:.25)),44+n*2);return b;}
