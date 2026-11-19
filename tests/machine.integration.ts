import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import manifest from '../contracts/plugin-manifest.json' with {type:'json'};
import {config} from '../src/domain/config.ts';
import {newProject,clone} from '../src/domain/model.ts';
import {lyricDigest,lineDigest,takeDigest,performedLines} from '../src/domain/lyrics.ts';
import {parseLRC} from '../src/domain/formats.ts';
import {scenario,original,base,selection,sha,wav,addTake,lrc} from './support/scenario.ts';
import {fixedScript} from './support/fixed-script.ts';
import {importAsset} from './support/assets.ts';
import {start} from './support/machine.ts';
test('正式制品42动作、真实PCM、固定歌词、LRC、返工、CLI/MCP与生命周期',{timeout:1200000},async t=>{
 const c=await start();let serial=0;const key=()=> 'lyric-'+(++serial),files:any[]=[];
 async function artifact(action:string,r:any,args:any={}){let offset=0;const chunks:Buffer[]=[];let expected:string|undefined;do{const d=await c.invoke(action,{...selection(r),...args,offset,max_bytes:16384});const b=Buffer.from(d.base64,'base64');assert.equal(sha(b),d.chunk_sha256);assert.equal(d.offset,offset);expected??=d.sha256;assert.equal(d.sha256,expected);chunks.push(b);offset+=b.length;if(d.next_offset===null)break;assert.equal(d.next_offset,offset);}while(offset<1000000);const bytes=Buffer.concat(chunks);assert.equal(sha(bytes),expected);return bytes;}
 try{
  assert.equal(c.cap.actions.length,manifest.contributions.actions.length);assert.deepEqual((await c.client.listTools()).tools.map((t:any)=>t.name),c.tools);
  for(const resource of [undefined,'references/workflows.md','references/operations.md'])assert.ok((await c.invoke('skills.read',{skill_id:'lyric-studio',...(resource?{resource}:{})})).content.length>100);
  const source=await fixedScript(c,original,'lyrics-source'),ref=await importAsset(c,wav(),'原创节拍测试音.wav','audio-source'),refs=[source.source_ref,ref],p=addTake(scenario());
  let r=await c.invoke('save_project',{content:p,source_refs:refs,expected_revision:0,expected_sha256:'',operation_key:'create'}),initial=r;
  assert.equal((await c.invoke('get_source',{...selection(r),source_index:0})).source.resource.body,original);
  assert.equal((await c.invoke('song_sheet',selection(r))).sections.length,3);
  assert.equal((await c.invoke('rhyme_report',selection(r))).groups[0].status,'declared_conflict');
  assert.equal((await c.invoke('lyric_digest',selection(r))).lyric_sha256,lyricDigest(p));
  assert.equal((await c.invoke('line_digest',{...selection(r),line_id:p.lines[0].id})).line_sha256,lineDigest(p.lines[0]));
  assert.equal((await c.invoke('take_digest',{...selection(r),take_id:'demo'})).take_sha256,takeDigest(p,'demo'));
  const audio=await c.invoke('inspect_take',{...selection(r),take_id:'demo'});assert.equal(audio.duration_ms,4000);assert.equal(audio.sha256,sha(wav()));assert.equal(audio.waveform.length,128);
  assert.equal(sha(await artifact('read_take',r,{take_id:'demo'})),sha(wav()));
  const temp:any={section:{id:'temp-section',title:'临时器乐段',kind:'instrumental',order:40},line:{...p.lines[0],id:'temp-line',order:99},occurrence:{id:'temp-occ',section_id:p.sections[0].id,order:80},variant:{...p.variants[0],id:'temp-variant'},take:{...p.takes[0],id:'temp-take'},mark:{id:'temp-mark',take_id:'demo',...performedLines(p)[0],start_ms:3500,end_ms:3800},note:{...p.notes[0],id:'temp-note'}};
  for(const item of Object.keys(config.fields)){
   const input={...base(r,key()),[item]:temp[item]};r=await c.invoke('put_'+item,input);assert.equal((await c.invoke('put_'+item,input)).sha256,r.sha256);
   const bad=await c.raw('put_'+item,{...input,[item]:{...temp[item],id:'different-id'}});assert.equal(bad.data?.result?.error?.code??bad.error?.code,'idempotency_conflict');r=await c.invoke('remove_'+item,{...base(r,key()),[item+'_id']:temp[item].id});
  }
  const preview=await c.invoke('preview_lyrics',{...selection(r),source_index:0});assert.equal(preview.lines.length,4);
  const imported=await c.invoke('save_project',{content:newProject('导入歌词测试'),source_refs:[source.source_ref],expected_revision:0,expected_sha256:'',operation_key:'import-empty'});await c.invoke('import_lyrics',{...base(imported,'import-lyrics'),source_index:0,id_prefix:'imported'});
  await c.invoke('preview_lrc',{content:lrc(p)});
  r=await c.invoke('import_lrc',{...base(r,'align'),take_id:'demo',import_id:'lrc-1',content:lrc(p)});
  assert.equal((await c.invoke('locate_audio',{...selection(r),take_id:'demo',time_ms:500})).marks[0].line_id,p.lines[1].id);
  const lrcBytes=await artifact('export_lrc',r,{take_id:'demo'});assert.equal(parseLRC(lrcBytes.toString()).entries.length,6);files.push({name:'逐句歌词.lrc',bytes:lrcBytes});
  files.push({name:'歌词.txt',bytes:await artifact('export_lyrics',r)},{name:'歌词审核本.html',bytes:await artifact('export_review',r)});
  for(const format of ['json','markdown','html']){let text='',offset=0,last:any;do{last=await c.invoke('export_project',{...selection(r),format,offset,max_bytes:2048});text+=last.content;offset=last.next_offset;}while(offset!==null);assert.equal(sha(text),last.report_sha256);if(format==='json')assert.equal(JSON.parse(text).project.marks.length,6);}
  const handoff=await c.invoke('audio_handoff',{...selection(r),take_id:'demo',target:'audio'});assert.equal(handoff.basis_ref.sha256,r.sha256);assert.deepEqual(handoff.source_ref,ref);
  const b=await c.invoke('save_project',{content:{...newProject('固定引用测试'),basis_refs:[{owner_plugin_id:manifest.id,...selection(r),sha256:r.sha256}]},source_refs:[],expected_revision:0,expected_sha256:'',operation_key:'basis'});assert.equal((await c.invoke('get_basis',{...selection(b),basis_index:0})).basis.sha256,r.sha256);
  await c.invoke('build_context',{...selection(r),goal:'按固定意见改首句',max_chars:256});await c.invoke('create_handoff',{...selection(r),goal:'先听原版再比较备选'});
  const aligned=r;r=await c.invoke('apply_variant',{...base(r,'apply-variant'),variant_id:'variant-1'});const check=await c.invoke('check_lyrics',selection(r));assert.ok(check.stale_note_ids.includes('note-1'));assert.equal(check.takes[0].stale_take,true);assert.ok(check.takes[0].stale_mark_ids.length);
  const rejected=await c.raw('export_lrc',{...selection(r),take_id:'demo'});assert.equal(rejected.data?.result?.status,'failed');assert.equal((await c.invoke('get_project',selection(aligned))).sha256,aligned.sha256);
  assert.ok((await c.invoke('compare_versions',{object_id:r.object.object_id,from_revision:1,to_revision:r.object.revision})).changes.includes('lines'));
  const wrong=await c.raw('save_project',{...base(initial,'stale-write'),content:p});assert.equal(wrong.data?.result?.error?.code??wrong.error?.code,'revision_conflict');
  assert.equal((await c.invoke('get_operation',{operation_key:'create'})).sha256,initial.sha256);
  assert.equal(c.cli('hetu.plugins.invoke',{...c.binding,capabilities_sha256:c.cap.capabilities_sha256,action:'get_project',arguments:selection(r)}).data.result.data.sha256,r.sha256);
  assert.ok((await c.invoke('list_projects',{})).objects.length>=3);
  for(const action of ['disable','enable','uninstall','install']){await c.apply(action);if(['enable','install'].includes(action)){await c.discover();assert.equal((await c.invoke('get_project',selection(r))).sha256,r.sha256);}else assert.notEqual((await c.raw('get_project',selection(r))).status,'succeeded');}
  assert.deepEqual([...c.actions].filter(a=>a!=='skills.read').sort(),manifest.contributions.actions.map(a=>a.id).sort());
  const out=process.env.HETU_RECEIPT_DIRECTORY??'output';await mkdir(out,{recursive:true});for(const f of files)await writeFile(path.join(out,f.name),f.bytes);
  await writeFile(path.join(out,'runtime-acceptance.json'),JSON.stringify({recorded_at:new Date().toISOString(),host_version:c.coreVersion,plugin_id:manifest.id,package_sha256:c.pkg.package_sha256,actions:[...c.actions],platform:process.platform,architecture:process.arch,actual_pcm_sha256:sha(wav()),actual_audio_duration_ms:4000,fixture_note:'原创合成节拍测试音，仅验证链路，不是真实演唱质量',repeated_chorus:true,stale_audio_marks_notes:true,original_revision_preserved:true,lifecycle:['install','disable','enable','uninstall','install'],CAS:true,original_operation:true,limits:['未执行付费生成、外发、正文采纳或定稿','Windows/Linux专业实机未验证']},null,2)+'\n');t.diagnostic(c.directory);
 }finally{await c.client.close();}
});
