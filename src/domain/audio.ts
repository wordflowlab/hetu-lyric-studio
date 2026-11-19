import {requireValue as need} from '../../vendor/project-store.ts';
import {readBlob} from './media.ts';
import {hash} from './artifact.ts';
/** 严格PCM16读取，时长来自实际采样帧，不从歌词估算。 */
export function inspectWav(b:Buffer){
 need(b.length>=44&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WAVE'&&b.readUInt32LE(4)+8===b.length,'WAV头或完整长度无效。');let at=12,fmt:any,pcm:Buffer|undefined;
 while(at+8<=b.length){const n=b.readUInt32LE(at+4),name=b.toString('ascii',at,at+4);need(at+8+n<=b.length,'WAV块截断。');const part=b.subarray(at+8,at+8+n);if(name==='fmt '){need(!fmt&&n>=16,'重复或无效格式块。');fmt={encoding:part.readUInt16LE(0),channels:part.readUInt16LE(2),sample_rate:part.readUInt32LE(4),byte_rate:part.readUInt32LE(8),align:part.readUInt16LE(12),bits:part.readUInt16LE(14)};}if(name==='data'){need(!pcm,'重复WAV数据块。');pcm=part;}at+=8+n+n%2;}
 need(at===b.length&&fmt&&pcm&&fmt.encoding===1&&fmt.bits===16&&[1,2].includes(fmt.channels)&&fmt.sample_rate>=8000&&fmt.sample_rate<=48000&&fmt.align===fmt.channels*2&&fmt.byte_rate===fmt.sample_rate*fmt.align&&pcm.length%fmt.align===0,'仅支持完整PCM16单／双声道WAV，参数须一致。');const frames=pcm.length/fmt.align;need(frames>0,'录音没有实际帧。');let peak=0,sum=0;const waveform:number[]=[];const samples=pcm.length/2;
 for(let bucket=0;bucket<128;bucket++){let max=0;for(let k=Math.floor(bucket*samples/128);k<Math.floor((bucket+1)*samples/128);k++){const x=pcm.readInt16LE(k*2)/32768;max=Math.max(max,Math.abs(x));sum+=x*x;}waveform.push(max);peak=Math.max(peak,max);}
 return {sample_rate:fmt.sample_rate,channels:fmt.channels,bits:16,frames,duration_ms:frames*1000/fmt.sample_rate,peak,rms:Math.sqrt(sum/samples),waveform,sha256:hash(b),total_bytes:b.length,note:'时长与波形来自真实PCM；不证明演唱、听取范围或作者认可。'};
}
export async function loadTake(p:any,s:any[],id:string,request:any){const t=p.takes.find((t:any)=>t.id===id);need(t,'录音不存在。');const ref=s[t.asset_source_index]?.source_ref;need(ref?.kind==='asset','录音必须关联当前作品固定asset来源。');const bytes=await readBlob(ref,request);return {take:t,source_ref:ref,bytes,meta:inspectWav(bytes)};}
export async function checkSources(p:any,s:any[],request:any){for(const t of p.takes){const a=await loadTake(p,s,t.id,request);for(const m of p.marks.filter((m:any)=>m.take_id===t.id))need(m.end_ms<=a.meta.duration_ms,'逐句时间超过实际录音。');}}
