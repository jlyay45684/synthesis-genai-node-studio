export const NODE_TYPES = {
  'checkpoint-loader': { title: 'Checkpoint Loader', cat: '載入器',
    inputs: [],
    outputs: [{id:'model',label:'MODEL',type:'MODEL'},{id:'clip',label:'CLIP',type:'CLIP'},{id:'vae',label:'VAE',type:'VAE'}],
    fields: [{k:'ckpt',label:'Checkpoint',type:'select',options:['flux1-dev.safetensors','sd_xl_base_1.0.safetensors','v1-5-pruned.safetensors','realisticVisionV60.safetensors'],def:'flux1-dev.safetensors'}] },
  'positive-prompt': { title: '正向提示詞', cat: '條件設定',
    inputs: [{id:'clip',label:'CLIP',type:'CLIP'}],
    outputs: [{id:'cond',label:'COND+',type:'CONDITIONING'}],
    fields: [{k:'text',label:'提示詞',type:'textarea',def:'cinematic portrait of a cybernetic explorer, neon rim light, ultra detailed'}] },
  'negative-prompt': { title: '負向提示詞', cat: '條件設定',
    inputs: [{id:'clip',label:'CLIP',type:'CLIP'}],
    outputs: [{id:'cond',label:'COND-',type:'CONDITIONING'}],
    fields: [{k:'text',label:'負向提示詞',type:'textarea',def:'blurry, low quality, watermark, distorted, artifacts'}] },
  'lora-loader': { title: 'LoRA 載入器', cat: '載入器',
    inputs: [{id:'model',label:'MODEL',type:'MODEL'},{id:'clip',label:'CLIP',type:'CLIP'}],
    outputs: [{id:'model',label:'MODEL',type:'MODEL'},{id:'clip',label:'CLIP',type:'CLIP'}],
    fields: [{k:'lora',label:'LoRA',type:'select',options:['none','cyberpunk-style.safetensors','detail-enhancer.safetensors','film-grain.safetensors'],def:'none'},{k:'strength',label:'強度',type:'number',min:0,max:2,step:0.05,def:0.8}] },
  'clip-text-encode': { title: 'CLIP 文字編碼', cat: '條件設定',
    inputs: [{id:'clip',label:'CLIP',type:'CLIP'},{id:'text',label:'文字',type:'TEXT'}],
    outputs: [{id:'cond',label:'COND',type:'CONDITIONING'}],
    fields: [{k:'text',label:'文字',type:'textarea',def:'a futuristic city skyline at dusk'}] },
  'empty-latent': { title: '空白潛空間圖像', cat: '潛空間',
    inputs: [],
    outputs: [{id:'latent',label:'LATENT',type:'LATENT'}],
    fields: [{k:'width',label:'寬度',type:'number',min:256,max:2048,step:64,def:1024},{k:'height',label:'高度',type:'number',min:256,max:2048,step:64,def:1024},{k:'batch',label:'批次',type:'number',min:1,max:8,step:1,def:1}] },
  'ksampler': { title: 'KSampler 採樣器', cat: '採樣',
    inputs: [{id:'model',label:'MODEL',type:'MODEL'},{id:'pos',label:'正向',type:'CONDITIONING'},{id:'neg',label:'負向',type:'CONDITIONING'},{id:'latent',label:'LATENT',type:'LATENT'}],
    outputs: [{id:'latent',label:'LATENT',type:'LATENT'}],
    fields: [{k:'seed',label:'種子',type:'number',min:0,max:999999999,step:1,def:424242},{k:'steps',label:'步數',type:'number',min:1,max:150,step:1,def:28},{k:'cfg',label:'CFG',type:'number',min:1,max:30,step:0.5,def:5.5},{k:'sampler',label:'採樣器',type:'select',options:['euler','euler_ancestral','dpmpp_2m','ddim'],def:'euler'},{k:'scheduler',label:'排程器',type:'select',options:['normal','karras','sgm_uniform'],def:'normal'},{k:'denoise',label:'去噪強度',type:'number',min:0,max:1,step:0.01,def:1}] },
  'vae-decode': { title: 'VAE 解碼', cat: '潛空間',
    inputs: [{id:'latent',label:'LATENT',type:'LATENT'},{id:'vae',label:'VAE',type:'VAE'}],
    outputs: [{id:'image',label:'IMAGE',type:'IMAGE'}],
    fields: [] },
  'output-preview': { title: '輸出預覽', cat: '輸出',
    inputs: [{id:'image',label:'IMAGE',type:'IMAGE'}],
    outputs: [],
    fields: [{k:'note',label:'備註',type:'text',def:'僅模擬預覽'}] },
};

export const PRESETS = {
  flux: {
    name: 'FLUX',
    nodes: [
      { type:'checkpoint-loader', x:40, y:120, data:{ckpt:'flux1-dev.safetensors'} },
      { type:'positive-prompt', x:340, y:60, data:{text:'cinematic sci-fi laboratory, volumetric cyan light, intricate machinery, 8k detail'} },
      { type:'negative-prompt', x:340, y:240, data:{text:'blurry, low quality, deformed, watermark'} },
      { type:'empty-latent', x:340, y:420, data:{width:1024,height:1024,batch:1} },
      { type:'ksampler', x:640, y:160, data:{seed:874321,steps:28,cfg:3.5,sampler:'euler',scheduler:'normal',denoise:1} },
      { type:'vae-decode', x:920, y:220, data:{} },
      { type:'output-preview', x:1160, y:200, data:{note:'FLUX 模擬預覽'} },
    ],
    links: [
      [0,'clip',1,'clip'],[0,'clip',2,'clip'],[0,'model',4,'model'],[0,'vae',5,'vae'],
      [1,'cond',4,'pos'],[2,'cond',4,'neg'],[3,'latent',4,'latent'],[4,'latent',5,'latent'],[5,'image',6,'image']
    ]
  },
  sdxl: {
    name: 'SDXL',
    nodes: [
      { type:'checkpoint-loader', x:40, y:120, data:{ckpt:'sd_xl_base_1.0.safetensors'} },
      { type:'positive-prompt', x:340, y:60, data:{text:'epic futuristic control room, holographic UI, dramatic lighting, high detail'} },
      { type:'negative-prompt', x:340, y:240, data:{text:'cartoon, blurry, lowres, bad anatomy'} },
      { type:'lora-loader', x:340, y:400, data:{lora:'detail-enhancer.safetensors',strength:0.7} },
      { type:'empty-latent', x:340, y:560, data:{width:1024,height:1024,batch:1} },
      { type:'ksampler', x:660, y:220, data:{seed:112233,steps:30,cfg:6.5,sampler:'dpmpp_2m',scheduler:'karras',denoise:1} },
      { type:'vae-decode', x:940, y:260, data:{} },
      { type:'output-preview', x:1180, y:240, data:{note:'SDXL 模擬預覽'} },
    ],
    links: [
      [0,'model',3,'model'],[0,'clip',3,'clip'],[3,'model',5,'model'],[3,'clip',1,'clip'],[3,'clip',2,'clip'],
      [0,'vae',6,'vae'],[1,'cond',5,'pos'],[2,'cond',5,'neg'],[4,'latent',5,'latent'],[5,'latent',6,'latent'],[6,'image',7,'image']
    ]
  },
  sd15: {
    name: 'SD 1.5',
    nodes: [
      { type:'checkpoint-loader', x:40, y:140, data:{ckpt:'v1-5-pruned.safetensors'} },
      { type:'positive-prompt', x:340, y:80, data:{text:'cyberpunk alley, neon signs, rain reflections, moody atmosphere'} },
      { type:'negative-prompt', x:340, y:260, data:{text:'low quality, grainy, overexposed'} },
      { type:'empty-latent', x:340, y:430, data:{width:512,height:768,batch:1} },
      { type:'ksampler', x:640, y:180, data:{seed:998877,steps:20,cfg:7,sampler:'euler_ancestral',scheduler:'normal',denoise:1} },
      { type:'vae-decode', x:920, y:220, data:{} },
      { type:'output-preview', x:1160, y:200, data:{note:'SD1.5 模擬預覽'} },
    ],
    links: [
      [0,'clip',1,'clip'],[0,'clip',2,'clip'],[0,'model',4,'model'],[0,'vae',5,'vae'],
      [1,'cond',4,'pos'],[2,'cond',4,'neg'],[3,'latent',4,'latent'],[4,'latent',5,'latent'],[5,'image',6,'image']
    ]
  }
};

export const PORT_TYPES = ['MODEL','CLIP','VAE','CONDITIONING','LATENT','IMAGE'];
