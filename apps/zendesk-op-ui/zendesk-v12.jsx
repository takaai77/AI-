import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";

const T = {
  bg:"#F9F4EF", surface:"#FFFFFF", card:"#FFFFFF", raised:"#F4EDE6", overlay:"#ECE0D6",
  primary:"#A87880", primaryLight:"#F7EBED", primaryXLight:"#FDF5F7", primaryDark:"#7D5560",
  primaryBorder:"rgba(168,120,128,0.28)",
  accent:"#C8A870", accentLight:"#F5EDD8", accentBorder:"rgba(200,168,112,0.28)",
  text:"#3A2C28", textSub:"#8A736C", textMeta:"#B8A49C", textDim:"#DDD0C8",
  border:"#EAE0D8", borderMid:"#D8CBBF",
  hover:"rgba(168,120,128,0.05)", active:"rgba(168,120,128,0.1)",
  success:"#6B9E74", successBg:"rgba(107,158,116,0.1)", successBorder:"rgba(107,158,116,0.24)",
  warning:"#C49040", warningBg:"rgba(196,144,64,0.1)", warningBorder:"rgba(196,144,64,0.24)",
  danger:"#C46060", dangerBg:"rgba(196,96,96,0.1)", dangerBorder:"rgba(196,96,96,0.24)",
  info:"#5A8CC4", infoBg:"rgba(90,140,196,0.1)", infoBorder:"rgba(90,140,196,0.24)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0}
  body{margin:0;background:#EDE3D8;display:flex;justify-content:center;padding:24px 0;min-height:100vh}
  :focus-visible{outline:2px solid #A87880;outline-offset:2px;border-radius:5px}
  :focus:not(:focus-visible){outline:none}
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-thumb{background:rgba(168,120,128,0.25);border-radius:3px}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes sheetIn{from{transform:translateY(100%);opacity:0.7}to{transform:translateY(0);opacity:1}}
  @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(8px) scale(0.97)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  .skeleton{background:linear-gradient(90deg,#F0E8E0 25%,#FAF4EE 50%,#F0E8E0 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:4px}
  .hbtn{cursor:pointer;transition:all 0.16s cubic-bezier(0.4,0,0.2,1)}
  .hbtn:hover:not(:disabled){filter:brightness(0.94)}
  .hbtn:active:not(:disabled){transform:scale(0.97)}
  details summary{list-style:none;cursor:pointer}
  details summary::-webkit-details-marker{display:none}
  input,textarea{caret-color:#A87880}
  input:focus,textarea:focus{border-color:rgba(168,120,128,0.6)!important;box-shadow:0 0 0 3px rgba(168,120,128,0.1)!important;outline:none}
`;

const Ic=({d,size=16,color="currentColor",sw=1.6})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" style={{flexShrink:0}}><path d={d}/></svg>
);
const ic={
  search:"M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
  chevD:"M6 9l6 6 6-6",chevU:"M18 15l-6-6-6 6",chevR:"M9 18l6-6-6-6",
  check:"M20 6L9 17l-5-5",x:"M18 6L6 18M6 6l12 12",
  edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  alertTri:"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  alertCirc:"M12 22a10 10 0 100-20 10 10 0 000 20zM12 8v4M12 16h.01",
  wifi:"M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01",
  user:"M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  support:"M4 12a8 8 0 0116 0v4a2 2 0 01-2 2h-2v-6h2M4 12v4a2 2 0 002 2h2v-6H6m4 5h4",
  credit:"M1 4h22v16H1zM1 10h22",
  home:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  calendar:"M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  clock:"M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  layers:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  plus:"M12 5v14M5 12h14",minus:"M5 12h14",
  truck:"M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  sync:"M4 4v5h5M20 20v-5h-5M20.49 9A9 9 0 105.64 18.36",
  pause:"M10 4H6v16h4V4zM18 4h-4v16h4V4z",
  trash:"M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  lock:"M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM17 11V7a5 5 0 00-10 0v4",
  repeat:"M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3",
  sparkle:"M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z",
  receipt:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  history:"M12 8v4l3 3M3.05 11a9 9 0 1 0 .5-3.5",
  cart:"M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0",
  single:"M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2",
  pin:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 10a1 1 0 100-2 1 1 0 000 2z",
  calFix:"M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v5M5 4a2 2 0 00-2 2v14a2 2 0 002 2h5",
  moon:"M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z",
  note:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18 2l4 4-10 10H8v-4L18 2z",
  shop:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10",
  skipFwd:"M5 4l10 8-10 8V4zM19 5v14",
  play:"M5 3l14 9-14 9V3z",
  box:"M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  pen:"M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
  warning2:"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  shipBox:"M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM12 12L3.27 7M12 12v9M12 12l8.73-5",
  mail:"M4 4h16v16H4zM4 7l8 6 8-6",
  send:"M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z",
  tag:"M20.59 13.41L11 3.83V3H4v7h.83l9.58 9.59a2 2 0 002.83 0l3.35-3.35a2 2 0 000-2.83zM7.5 7.5h.01",
};

// ── 固定日ユーティリティ ──
const WEEKDAY_NAMES=["日","月","火","水","木","金","土"];
const NTH_NAMES=["第1","第2","第3","第4","最終"];
const NTH_VALUES=[1,2,3,4,5];
const FIXED_DAYS=[1,5,10,15,20,25];
function getNextFixedDay(baseStr,day,months=1){
  const b=new Date(baseStr);let d=new Date(b.getFullYear(),b.getMonth(),day);
  if(d<=b)d=new Date(b.getFullYear(),b.getMonth()+months,day);
  return d.toISOString().slice(0,10);
}
function getNextNthWeekday(baseStr,nth,wd,months=1){
  const b=new Date(baseStr);
  function f(y,m){
    if(nth===5){const l=new Date(y,m+1,0);while(l.getDay()!==wd)l.setDate(l.getDate()-1);return new Date(l);}
    const d=new Date(y,m,1);while(d.getDay()!==wd)d.setDate(d.getDate()+1);d.setDate(d.getDate()+(nth-1)*7);return new Date(d);
  }
  let c=f(b.getFullYear(),b.getMonth());
  if(c<=b)c=f(b.getFullYear(),b.getMonth()+months);
  return c.toISOString().slice(0,10);
}
function calcFixedSchedule(pattern,months,count=4){
  const dates=[];let base=new Date().toISOString().slice(0,10);
  for(let i=0;i<count;i++){
    const next=pattern.type==="day"?getNextFixedDay(base,pattern.day,months):getNextNthWeekday(base,pattern.nth,pattern.weekday,months);
    dates.push(next);base=next;
  }
  return dates;
}
function patternLabel(p){
  if(!p)return null;
  if(p.type==="day")return`毎月${p.day}日`;
  return`${NTH_NAMES[p.nth-1]}${WEEKDAY_NAMES[p.weekday]}曜日`;
}

// ── ステータス ──
const ORDER_STATUS={
  "未決済":    {color:T.info,   bg:T.infoBg,   border:T.infoBorder,   scope:"both",editable:true},
  "発送待ち":  {color:T.info,   bg:T.infoBg,   border:T.infoBorder,   scope:"both",editable:true},
  "発送準備中":{color:T.info,   bg:T.infoBg,   border:T.infoBorder,   scope:"next",editable:false},
  "出荷済":    {color:T.success,bg:T.successBg,border:T.successBorder,scope:"next",editable:false},
  "配送完了":  {color:T.success,bg:T.successBg,border:T.successBorder,scope:"next",editable:false},
  "スキップ":  {color:T.warning,bg:T.warningBg,border:T.warningBorder,scope:"next",editable:false},
  "キャンセル":{color:T.danger, bg:T.dangerBg, border:T.dangerBorder, scope:"next",editable:false},
  "支払待ち":  {color:T.warning,bg:T.warningBg,border:T.warningBorder,scope:"next",editable:false},
};
const scopeLabel={both:"今回＆次回以降",next:"次回以降のみ"};

// ── マスタ ──
const PRODUCTS=[
  {id:"SJ-720",name:"豊潤サジー",size:"720ml", price:4980,unit:"本",tag:"定番",  stock:true, maxQty:12},
  {id:"SJ-360",name:"豊潤サジー",size:"360ml", price:2980,unit:"本",tag:"お試し",stock:true, maxQty:12},
  {id:"SJ-1L", name:"豊潤サジー",size:"1000ml",price:5980,unit:"本",tag:"大容量",stock:true, maxQty:6},
  {id:"SN-1",  name:"サジーナ",  size:"1袋",   price:3480,unit:"袋",tag:"粉末",  stock:true, maxQty:12},
  {id:"SW-1",  name:"スマートウォーター",size:"500ml",price:380,unit:"本",tag:"",stock:false,maxQty:0},
];
const FREQ_MAP=[
  {key:"30d", label:"毎月",  months:1,course:"ゴールド",   price:4980,current:true},
  {key:"60d", label:"2ヶ月", months:2,course:"ゴールド",   price:9960},
  {key:"90d", label:"3ヶ月", months:3,course:"プラチナ",   price:13980},
  {key:"120d",label:"4ヶ月", months:4,course:"プラチナ",   price:17980},
  {key:"180d",label:"6ヶ月", months:6,course:"プラチナ×2",price:26980},
];
const SUBS=[
  {id:"SUB-001",label:"3ヶ月定期",freqKey:"90d",freqLabel:"3ヶ月",months:3,nextDate:"2026-03-15",
   course:"プラチナ",status:"active",datePattern:null,
   items:[{productId:"SJ-1L",name:"豊潤サジー",size:"1000ml",qty:3,price:5980}],
   price:17940,timeSlot:"午前中",payment:"VISA ****4242",count:4,
   latestOrder:{id:"ORD-2402",status:"発送待ち",date:"2026/02/15"},
   child:{
     id:"ORD-2403",editable:true,lockReason:"",shipDate:"2026-03-12",deliveryDate:"2026-03-15",status:"発送待ち",deadline:"2026-03-09",
     lineItems:[
       {type:"subscription",name:"豊潤サジー",size:"1000ml",qty:3,price:5980},
       {type:"single_add",name:"サジー360ml",size:"360ml",qty:1,price:2980},
     ],
     pointsUsed:500,couponDiscount:0,shippingFee:0,totalAmount:20440,
   }},
  {id:"SUB-002",label:"毎月定期",freqKey:"30d",freqLabel:"毎月",months:1,nextDate:"2026-03-20",
   course:"サジーナコース",status:"active",datePattern:{type:"day",day:20},
   items:[{productId:"SN-1",name:"サジーナ",size:"1袋",qty:1,price:3480}],
   price:3480,timeSlot:"14-16時",payment:"VISA ****4242",count:8,
   latestOrder:{id:"ORD-2401",status:"配送完了",date:"2026/02/20"},
   child:{
     id:"ORD-2404",editable:true,lockReason:"",shipDate:"2026-03-17",deliveryDate:"2026-03-20",status:"発送待ち",deadline:"2026-03-14",
     lineItems:[
       {type:"subscription",name:"サジーナ",size:"1袋",qty:1,price:3480},
     ],
     pointsUsed:0,couponDiscount:0,shippingFee:0,totalAmount:3480,
   }},
  {id:"SUB-003",label:"2ヶ月定期",freqKey:"60d",freqLabel:"2ヶ月",months:2,nextDate:"2026-05-10",
   course:"ゴールド",status:"paused",pauseReason:"在庫が余っている",pausedAt:"2026-01-10",datePattern:null,
   items:[{productId:"SJ-720",name:"豊潤サジー",size:"720ml",qty:2,price:4980}],
   price:9960,timeSlot:"午前中",payment:"VISA ****4242",count:6,
   latestOrder:{id:"ORD-2310",status:"スキップ",date:"2025/11/10"},
   child:{
     id:"ORD-2310",editable:false,lockReason:"停止中のため変更不可",shipDate:null,deliveryDate:null,status:"スキップ",deadline:null,
     lineItems:[
       {type:"subscription",name:"豊潤サジー",size:"720ml",qty:2,price:4980},
     ],
     pointsUsed:0,couponDiscount:0,shippingFee:0,totalAmount:9960,
   }},
];
const MOCK={
  name:"山田 花子",kana:"ヤマダ ハナコ",id:"1004281",phone:"090-1234-5678",
  email:"hanako@example.com",address:"東京都渋谷区神宮前1-2-3 コーポ渋谷202",
  memberType:"通常会員",dmOptIn:true,newsletterOptIn:true,outboundBlocked:false,customerMemo:"",
  subscriptions:SUBS,
  orders:[
    {id:"ORD-SINGLE-01",date:"2026/02/22",status:"支払待ち",amt:"¥2,980",items:"サジー360ml×1",isSingle:true},
    {id:"ORD-2402",date:"2026/02/15",status:"発送待ち",amt:"¥17,940",items:"サジー1L×3",isSingle:false},
    {id:"ORD-2401",date:"2026/02/20",status:"配送完了",amt:"¥3,480",items:"サジーナ×1",isSingle:false},
    {id:"ORD-2312",date:"2025/12/15",status:"スキップ",amt:"—",items:"—",isSingle:false},
    {id:"ORD-2311",date:"2025/11/15",status:"配送完了",amt:"¥5,980",items:"サジー720ml×1",isSingle:false},
  ],
};
const MOCK_SINGLE={
  name:"鈴木 太郎",kana:"スズキ タロウ",id:"1004282",phone:"090-9876-5432",
  email:"taro@example.com",address:"大阪府大阪市北区梅田1-1-1",
  memberType:"通常会員",dmOptIn:false,newsletterOptIn:false,outboundBlocked:false,customerMemo:"",
  subscriptions:[],
  orders:[
    {id:"ORD-SINGLE-02",date:"2026/02/20",status:"支払待ち",amt:"¥4,980",items:"サジー720ml×1",isSingle:true},
    {id:"ORD-3101",date:"2026/01/10",status:"配送完了",amt:"¥2,980",items:"サジー360ml×1",isSingle:true},
    {id:"ORD-3002",date:"2025/12/05",status:"配送完了",amt:"¥2,980",items:"サジー360ml×1",isSingle:true},
  ],
};
const MOCK_DUP_1={
  name:"山田 花子",kana:"ヤマダ ハナコ",id:"1005312",phone:"090-1234-9988",
  email:"hanako.y2@example.com",address:"東京都新宿区西新宿2-8-1",
  memberType:"通常会員",dmOptIn:true,newsletterOptIn:false,outboundBlocked:false,customerMemo:"",
  subscriptions:[],
  orders:[
    {id:"ORD-SINGLE-11",date:"2026/02/18",status:"配送完了",amt:"¥2,980",items:"サジー360ml×1",isSingle:true},
  ],
};
const MOCK_DUP_2={
  name:"山田 華子",kana:"ヤマダ ハナコ",id:"1006420",phone:"090-1234-2211",
  email:"hanako.h@example.com",address:"東京都品川区北品川1-2-3",
  memberType:"優良会員",dmOptIn:true,newsletterOptIn:true,outboundBlocked:false,customerMemo:"",
  subscriptions:[{
    id:"SUB-101",label:"毎月定期",freqKey:"30d",freqLabel:"毎月",months:1,nextDate:"2026-03-25",
    course:"サジーナコース",status:"active",datePattern:{type:"day",day:25},
    items:[{productId:"SN-1",name:"サジーナ",size:"1袋",qty:1,price:3480}],
    price:3480,timeSlot:"午前中",payment:"VISA ****1111",count:2,
    latestOrder:{id:"ORD-3500",status:"発送待ち",date:"2026/02/25"},
    child:{
      id:"ORD-3501",editable:true,lockReason:"",shipDate:"2026-03-22",deliveryDate:"2026-03-25",status:"発送待ち",deadline:"2026-03-19",
      lineItems:[{type:"subscription",name:"サジーナ",size:"1袋",qty:1,price:3480}],
      pointsUsed:0,couponDiscount:0,shippingFee:0,totalAmount:3480,
    },
  }],
  orders:[
    {id:"ORD-3500",date:"2026/02/25",status:"発送待ち",amt:"¥3,480",items:"サジーナ×1",isSingle:false},
    {id:"ORD-3490",date:"2026/01/25",status:"配送完了",amt:"¥3,480",items:"サジーナ×1",isSingle:false},
  ],
};
const SEARCH_POOL=[MOCK,MOCK_SINGLE,MOCK_DUP_1,MOCK_DUP_2];

// ── 日付 util ──
const _today=new Date();_today.setHours(0,0,0,0);
const DEADLINE=(()=>{const d=new Date(_today);d.setDate(d.getDate()+3);return d.toISOString().slice(0,10);})();
function addDays(s,n){const d=new Date(s);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
function addMonths(s,n){const d=new Date(s);d.setMonth(d.getMonth()+n);return d.toISOString().slice(0,10);}
function calcShip(s){const d=new Date(s);let c=0;while(c<5){d.setDate(d.getDate()-1);if(d.getDay()&&d.getDay()!==6)c++;}return d.toISOString().slice(0,10);}
function calcArrivalFromShip(s){const d=new Date(s);let c=0;while(c<5){d.setDate(d.getDate()+1);if(d.getDay()&&d.getDay()!==6)c++;}return d.toISOString().slice(0,10);}
function getJstNowParts(ts=Date.now()){
  const d=new Date(ts+9*60*60*1000);
  const y=d.getUTCFullYear(),m=d.getUTCMonth()+1,day=d.getUTCDate();
  const hour=d.getUTCHours(),minute=d.getUTCMinutes(),second=d.getUTCSeconds();
  return{
    year:y,month:m,day,
    hour,minute,second,
    date:`${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`,
  };
}
function fmtRemain(sec){const s=Math.max(0,sec|0);const mm=String(Math.floor(s/60)).padStart(2,"0");const ss=String(s%60).padStart(2,"0");return`${mm}:${ss}`;}
function fmtD(s){if(!s)return"—";const[y,m,d]=s.split("-");return`${y}年${+m}月${+d}日`;}
function fmtMD(s){if(!s)return"—";const[,m,d]=s.split("-");return`${+m}月${+d}日`;}
function fmtDS(s){if(!s)return"—";const[,m,d]=s.split("-");const w=["日","月","火","水","木","金","土"][new Date(s).getDay()];return`${+m}月${+d}日（${w}）`;}
const fmtP=n=>"¥"+Number(n).toLocaleString();
const parseYen=v=>{
  if(typeof v==="number")return Math.max(0,Math.floor(v));
  const n=Number(String(v||"").replace(/[^\d]/g,""));
  return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
};
function parseSingleItemText(text){
  const raw=String(text||"").replace(/（[^）]*）/g,"").trim();
  const qtyMatch=raw.match(/×\s*(\d+)/);
  const qty=qtyMatch?Math.max(1,Number(qtyMatch[1])||1):1;
  const base=(qtyMatch?raw.slice(0,qtyMatch.index):raw).trim();
  const parts=base.split(/\s+/).filter(Boolean);
  if(parts.length===0)return{productName:"商品",size:"",qty};
  if(parts.length===1)return{productName:parts[0],size:"",qty};
  const last=parts[parts.length-1];
  if(/(\d|ml|袋|本|kg|g|L|リットル)/i.test(last)){
    return{productName:parts.slice(0,-1).join(" "),size:last,qty};
  }
  return{productName:base,size:"",qty};
}
const qty2desc=items=>items?.map(i=>`${i.name} ${i.size}×${i.qty}`).join("、")||"";
function detectType(v){
  if(!v.trim())return null;const n=v.replace(/[-\s]/g,"");
  if(/^[0-9]{1,7}$/.test(n))return"id";
  if(/^0[0-9]{9,10}$/.test(n))return"phone";
  if(v.includes("@"))return"email";
  return"name";
}
const typeMap={
  id:   {label:"顧客ID",       color:T.info,   bg:T.infoBg},
  phone:{label:"電話番号",     color:T.success,bg:T.successBg},
  email:{label:"メール",       color:T.primary,bg:T.primaryLight},
  name: {label:"氏名・フリガナ",color:T.warning,bg:T.warningBg},
};

const ZIP_LOOKUP={
  "150-0001":{pref:"東京都",addr:"渋谷区神宮前1-2-3",bldg:"コーポ渋谷202"},
  "530-0001":{pref:"大阪府",addr:"大阪市北区梅田1-1-1",bldg:"梅田ビル801"},
  "060-0001":{pref:"北海道",addr:"札幌市中央区北一条西2-3",bldg:""},
};
const BUILD_VER="20260223-2015";

function useFocusTrap(active){
  const ref=useRef(null);
  useEffect(()=>{
    if(!active||!ref.current)return;
    const el=ref.current;
    const sel='button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select,[tabindex]:not([tabindex="-1"])';
    const ns=el.querySelectorAll(sel);if(!ns.length)return;
    const first=ns[0],last=ns[ns.length-1];first.focus();
    const h=e=>{if(e.key!=="Tab")return;if(e.shiftKey){if(document.activeElement===first){e.preventDefault();last.focus();}}else{if(document.activeElement===last){e.preventDefault();first.focus();}}};
    el.addEventListener("keydown",h);return()=>el.removeEventListener("keydown",h);
  },[active]);
  return ref;
}

// ══════════════════════════════════════════════════════
//  共通コンポーネント
// ══════════════════════════════════════════════════════
function Spinner({size=13,color=T.primary}){
  return <div style={{width:size,height:size,borderRadius:"50%",border:`1.5px solid ${color}30`,borderTopColor:color,animation:"spin 0.7s linear infinite",flexShrink:0}}/>;
}

const Badge=({color,bg,border,children,small,dot})=>(
  <span style={{display:"inline-flex",alignItems:"center",gap:dot?4:0,
    background:bg||"rgba(255,255,255,0.85)",border:`1px solid ${border||color+"28"}`,
    color,fontSize:small?9:10,fontWeight:700,letterSpacing:0.3,
    padding:small?"1px 7px":"2px 9px",borderRadius:99,flexShrink:0}}>
    {dot&&<span style={{width:4,height:4,borderRadius:"50%",background:color,flexShrink:0}}/>}
    {children}
  </span>
);

function ErrorBlock({type="generic",onRetry}){
  const cfg={
    network: {icon:"wifi",     color:T.warning,bg:T.warningBg,border:T.warningBorder,title:"ネットワークエラー",body:"接続を確認して再試行してください"},
    saveFail:{icon:"alertTri", color:T.danger, bg:T.dangerBg, border:T.dangerBorder, title:"保存に失敗しました", body:"変更が反映されませんでした"},
    notFound:{icon:"search",   color:T.info,   bg:T.infoBg,   border:T.infoBorder,   title:"顧客が見つかりません",body:"入力内容を確認してください"},
    generic: {icon:"alertCirc",color:T.danger, bg:T.dangerBg, border:T.dangerBorder, title:"エラーが発生しました",body:"もう一度お試しください"},
  }[type]||{icon:"alertCirc",color:T.danger,bg:T.dangerBg,border:T.dangerBorder,title:"エラー",body:""};
  return(
    <div role="alert" style={{background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:10,padding:"14px",textAlign:"center",marginBottom:4}}>
      <div style={{width:34,height:34,borderRadius:"50%",background:cfg.bg,border:`1.5px solid ${cfg.border}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 9px"}}>
        <Ic d={ic[cfg.icon]} size={15} color={cfg.color}/>
      </div>
      <p style={{fontSize:12,fontWeight:700,color:cfg.color,margin:"0 0 4px"}}>{cfg.title}</p>
      <p style={{fontSize:10,color:T.textSub,lineHeight:1.7,margin:"0 0 10px"}}>{cfg.body}</p>
      {onRetry&&<button onClick={onRetry} className="hbtn" style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:6,border:`1.5px solid ${cfg.border}`,background:T.surface,color:cfg.color,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",minHeight:30}}>
        <Ic d={ic.refresh} size={11} color={cfg.color}/>再試行
      </button>}
    </div>
  );
}

function Section({iconKey,title,children,defaultOpen=true,right,noBorder,countBadge}){
  const[open,setOpen]=useState(defaultOpen);
  return(
    <div>
      <button onClick={()=>setOpen(!open)} className="hbtn" aria-expanded={open}
        style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"9px 16px",background:open?T.raised:"transparent",border:"none",
          borderTop:noBorder?"none":`1px solid ${T.border}`,
          cursor:"pointer",fontFamily:"inherit",minHeight:38}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          {iconKey&&<Ic d={ic[iconKey]} size={12} color={open?T.primary:T.textMeta} sw={1.6}/>}
          <span style={{fontSize:10,fontWeight:700,color:open?T.textSub:T.textMeta,letterSpacing:0.6,textTransform:"uppercase"}}>{title}</span>
          {countBadge!=null&&<span style={{fontSize:9,fontWeight:700,color:"#fff",background:T.primary,padding:"0 6px",borderRadius:99,lineHeight:"16px",minWidth:16,textAlign:"center"}}>{countBadge}</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7}}>{right}<Ic d={open?ic.chevU:ic.chevD} size={11} color={T.textMeta}/></div>
      </button>
      {open&&<div style={{background:T.surface,borderTop:`1px solid ${T.border}`,animation:"fadeUp 0.14s ease"}}>{children}</div>}
    </div>
  );
}

function EditRow({label,value,onEdit,accent,last,note,kana}){
  const[hov,setHov]=useState(false);
  return(
    <div style={{padding:"9px 16px",borderBottom:last?"none":`1px solid ${T.border}`,background:hov&&onEdit?T.hover:"transparent",transition:"background 0.14s"}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:10,color:T.textMeta,flexShrink:0}}>{label}</span>
        <div style={{display:"flex",alignItems:"center",gap:5,minWidth:0}}>
          <div style={{textAlign:"right",minWidth:0}}>
            <span style={{fontSize:12,fontWeight:accent?700:500,color:accent?T.primaryDark:T.text,wordBreak:"break-all",
              fontFamily:accent?"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif":"inherit"}}>{value}</span>
            {kana&&<p style={{fontSize:9,color:T.textMeta,margin:"1px 0 0"}}>{kana}</p>}
          </div>
          {onEdit&&<button onClick={onEdit} className="hbtn" style={{background:"none",border:"none",cursor:"pointer",padding:3,flexShrink:0,borderRadius:4,display:"flex",alignItems:"center",opacity:hov?0.65:0.25,transition:"opacity 0.14s"}}>
            <Ic d={ic.edit} size={11} color={T.textSub}/>
          </button>}
        </div>
      </div>
      {note&&<p style={{fontSize:9,color:T.textMeta,margin:"2px 0 0",lineHeight:1.6}}>{note}</p>}
    </div>
  );
}

function OrderEditRow({iconKey,label,value,onEdit,last,note}){
  const[hov,setHov]=useState(false);
  return(
    <div style={{padding:"8px 0",borderBottom:last?"none":`1px solid ${T.border}`}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
        <div style={{width:19,height:19,borderRadius:5,background:T.raised,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
          <Ic d={ic[iconKey]} size={10} color={T.textSub} sw={1.7}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontSize:9,color:T.textMeta,margin:0}}>{label}</p>
          <p style={{fontSize:11,fontWeight:700,color:T.text,margin:"1px 0 0",lineHeight:1.45,wordBreak:"break-word"}}>{value}</p>
          {note&&<p style={{fontSize:8,color:T.textMeta,margin:"2px 0 0",lineHeight:1.5}}>{note}</p>}
        </div>
        {onEdit&&<button onClick={onEdit} className="hbtn"
          style={{background:"none",border:"none",cursor:"pointer",padding:3,borderRadius:4,display:"flex",alignItems:"center",opacity:hov?0.7:0.35,transition:"opacity 0.14s"}}>
          <Ic d={ic.pen} size={12} color={T.textSub}/>
        </button>}
      </div>
    </div>
  );
}

function Btn({label,iconKey,onClick,variant="ghost",disabled,isLoading}){
  const s={
    ghost:  {bg:T.raised,    color:T.textSub, border:`1px solid ${T.border}`,  shadow:"none"},
    primary:{bg:T.primary,   color:"#fff",    border:"none",                   shadow:"0 2px 14px rgba(168,120,128,0.3)"},
    warning:{bg:"transparent",color:T.warning,border:`1px solid ${T.warningBorder}`,shadow:"none"},
    danger: {bg:"transparent",color:T.danger, border:`1px solid ${T.dangerBorder}`, shadow:"none"},
    success:{bg:T.success,   color:"#fff",    border:"none",                   shadow:"0 2px 10px rgba(107,158,116,0.3)"},
  }[variant]||{bg:T.raised,color:T.textSub,border:`1px solid ${T.border}`,shadow:"none"};
  return(
    <button onClick={onClick} disabled={disabled||isLoading} className={disabled||isLoading?"":"hbtn"}
      style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:6,
        padding:"11px 14px",borderRadius:9,border:s.border,
        background:disabled||isLoading?T.raised:s.bg,
        color:disabled||isLoading?T.textMeta:s.color,
        fontSize:12,fontWeight:700,cursor:disabled||isLoading?"not-allowed":"pointer",
        fontFamily:"inherit",opacity:disabled?0.5:1,minHeight:42,
        boxShadow:disabled||isLoading?"none":s.shadow,letterSpacing:0.2,transition:"all 0.15s"}}>
      {isLoading?<><Spinner size={12} color={s.color}/><span>処理中…</span></>:<>{iconKey&&<Ic d={ic[iconKey]} size={13}/>}<span>{label}</span></>}
    </button>
  );
}

function Nav({canNext,onBack,onNext,label,danger,isLoading}){
  return(
    <div style={{display:"flex",gap:7,marginTop:14}}>
      {onBack&&<button onClick={onBack} className="hbtn" style={{flex:"0 0 64px",padding:"10px 0",borderRadius:9,border:`1px solid ${T.border}`,background:T.raised,color:T.textSub,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",minHeight:42}}>← 戻る</button>}
      <button onClick={onNext} disabled={!canNext||isLoading} className={canNext&&!isLoading?"hbtn":""}
        style={{flex:1,padding:"10px 0",borderRadius:9,border:danger?`1px solid ${T.dangerBorder}`:"none",
          background:!canNext||isLoading?T.raised:danger?T.dangerBg:T.primary,
          color:!canNext||isLoading?T.textMeta:danger?T.danger:"#fff",
          fontSize:12,fontWeight:700,cursor:!canNext||isLoading?"not-allowed":"pointer",fontFamily:"inherit",minHeight:42,
          boxShadow:canNext&&!isLoading&&!danger?"0 2px 12px rgba(168,120,128,0.3)":"none",
          display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all 0.15s"}}>
        {isLoading&&<Spinner size={12} color={danger?T.danger:"#fff"}/>}{label}
      </button>
    </div>
  );
}

function MiniCal({value,onChange,minDate,maxDate,markerDate,markerTone="info"}){
  const[cur,setCur]=useState(value?new Date(value):new Date());
  const y=cur.getFullYear(),m=cur.getMonth();
  const fd=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate();
  const cells=[];for(let i=0;i<fd;i++)cells.push(null);for(let d=1;d<=dim;d++)cells.push(d);
  const sel=value?new Date(value):null;
  const marker=markerDate?new Date(markerDate):null;
  const markerColor=markerTone==="warning"?T.warning:markerTone==="success"?T.success:T.info;
  const mN=["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
  return(
    <div style={{background:T.card,borderRadius:10,border:`1px solid ${T.border}`,overflow:"hidden",boxShadow:"0 1px 8px rgba(168,120,128,0.07)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderBottom:`1px solid ${T.border}`,background:T.raised}}>
        <button onClick={()=>setCur(new Date(y,m-1,1))} className="hbtn" style={{background:"none",border:"none",cursor:"pointer",padding:"3px 8px",color:T.textSub,fontSize:16,minHeight:30}}>‹</button>
        <span style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{y}年 {mN[m]}</span>
        <button onClick={()=>setCur(new Date(y,m+1,1))} className="hbtn" style={{background:"none",border:"none",cursor:"pointer",padding:"3px 8px",color:T.textSub,fontSize:16,minHeight:30}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"6px 6px 2px",gap:1}}>
        {["日","月","火","水","木","金","土"].map((d,i)=>(
          <div key={d} style={{textAlign:"center",fontSize:9,fontWeight:700,color:i===0?"#E07070":i===6?T.info:T.textMeta,padding:"2px 0"}}>{d}</div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"2px 6px 10px",gap:1}}>
        {cells.map((d,i)=>{
          if(!d)return<div key={i}/>;
          const td=new Date(y,m,d);
          const isPast=td<_today;
          const isBeforeMin=minDate&&td<new Date(minDate);
          const isAfterMax=maxDate&&td>new Date(maxDate);
          const disabled=isPast||isBeforeMin||isAfterMax;
          const isSel=sel&&td.toDateString()===sel.toDateString();
          const isMarker=marker&&td.toDateString()===marker.toDateString();
          const dw=td.getDay();
          const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          return(<button key={i} disabled={disabled} onClick={()=>onChange(ds)} className={disabled?"":"hbtn"}
            style={{padding:"5px 0",borderRadius:6,border:"none",cursor:disabled?"not-allowed":"pointer",
              fontFamily:"inherit",fontSize:11,fontWeight:isSel?800:400,
              background:isSel?T.primary:"transparent",
              color:isSel?"#fff":disabled?T.textDim:dw===0?"#E07070":dw===6?T.info:T.text,
              boxShadow:isSel?"0 2px 8px rgba(168,120,128,0.3)":"none",
              opacity:disabled?0.22:1,transition:"all 0.12s",position:"relative"}}>
              <span>{d}</span>
              {isMarker&&!isSel&&(
                <span style={{position:"absolute",right:2,top:2,width:10,height:10,borderRadius:"50%",background:markerColor,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 0 1px rgba(255,255,255,0.9)"}}>
                  <Ic d={ic.truck} size={6} color="#fff" sw={1.8}/>
                </span>
              )}
            </button>);
        })}
      </div>
    </div>
  );
}

function Sheet({title,iconKey,onClose,children}){
  const trapRef=useFocusTrap(true);
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape")onClose();};
    document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);
  },[onClose]);
  return(
    <div role="dialog" aria-modal="true" aria-label={title}
      style={{position:"fixed",inset:0,background:"rgba(58,44,40,0.4)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div ref={trapRef} style={{background:T.card,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:380,maxHeight:"92vh",overflowY:"auto",
        boxShadow:"0 -12px 48px rgba(58,44,40,0.15)",animation:"sheetIn 0.26s cubic-bezier(0.32,0.72,0,1)",
        borderTop:`2px solid ${T.primaryBorder}`}}>
        <div style={{padding:"11px 14px 0"}}>
          <div style={{width:32,height:3,background:T.border,borderRadius:99,margin:"0 auto 10px"}}/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              {iconKey&&<div style={{width:28,height:28,borderRadius:7,background:T.primaryLight,border:`1px solid ${T.primaryBorder}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Ic d={ic[iconKey]} size={13} color={T.primary} sw={1.7}/>
              </div>}
              <p style={{fontSize:13,fontWeight:700,color:T.text,margin:0,letterSpacing:0.2}}>{title}</p>
            </div>
            <button onClick={onClose} className="hbtn" style={{background:"none",border:"none",cursor:"pointer",padding:5,borderRadius:5,display:"flex",alignItems:"center",opacity:0.45}}>
              <Ic d={ic.x} size={14} color={T.textSub}/>
            </button>
          </div>
        </div>
        <div style={{padding:"0 14px 28px"}}>{children}</div>
      </div>
    </div>
  );
}

function ScopeSelector({scope,setScope,childEditable,childId,lockReason,shipDate,autoScope}){
  return(
    <div>
      <div style={{background:T.infoBg,border:`1px solid ${T.infoBorder}`,borderRadius:8,padding:"7px 10px",marginBottom:8,display:"flex",gap:7,alignItems:"center"}}>
        <Ic d={ic.sparkle} size={11} color={T.info}/>
        <p style={{fontSize:10,color:T.info,fontWeight:700,margin:0}}>「{scopeLabel[autoScope]}」を自動提案</p>
      </div>
      <div style={{background:childEditable?T.successBg:T.warningBg,border:`1px solid ${childEditable?T.successBorder:T.warningBorder}`,borderRadius:8,padding:"7px 10px",marginBottom:8,display:"flex",gap:7,alignItems:"flex-start"}}>
        <Ic d={childEditable?ic.check:ic.lock} size={11} color={childEditable?T.success:T.warning}/>
        <div>
          <p style={{fontSize:11,fontWeight:700,color:childEditable?T.success:T.warning,margin:"0 0 1px"}}>子注文（{childId}）{childEditable?"は変更可能":"は変更不可"}</p>
          <p style={{fontSize:9,color:T.textSub,margin:0,lineHeight:1.6}}>{childEditable?`発送予定：${fmtD(shipDate)}`:lockReason}</p>
        </div>
      </div>
      <div role="radiogroup" style={{display:"flex",flexDirection:"column",gap:5}}>
        {[{k:"both",l:"🥚 今回＋次回以降",s:"子注文と定期マスタを同時更新",dis:!childEditable},
          {k:"next",l:"🐣 次回以降のみ",s:"定期マスタのみ更新",dis:false}].map(o=>{
          const sel=(scope===o.k)||(o.k==="next"&&scope==="both"&&!childEditable);
          return(
            <button key={o.k} role="radio" aria-checked={sel} onClick={()=>!o.dis&&setScope(o.k)} disabled={o.dis} className={o.dis?"":"hbtn"}
              style={{padding:"9px 11px",borderRadius:9,textAlign:"left",border:`1.5px solid ${sel&&!o.dis?T.primary:T.border}`,background:sel&&!o.dis?T.primaryXLight:T.surface,cursor:o.dis?"not-allowed":"pointer",fontFamily:"inherit",opacity:o.dis?0.35:1,display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all 0.15s"}}>
              <div>
                <p style={{fontSize:12,fontWeight:700,color:T.text,margin:0}}>{o.l}</p>
                <p style={{fontSize:9,color:T.textMeta,margin:"1px 0 0"}}>{o.s}</p>
              </div>
              <div style={{display:"flex",gap:4}}>
                {autoScope===o.k&&!o.dis&&<Badge color={T.primary} bg={T.primaryLight} border={T.primaryBorder} small>提案</Badge>}
                {o.dis&&<Badge color={T.warning} bg={T.warningBg} border={T.warningBorder} small>強制</Badge>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DatePatternSelector({pattern,setPattern,intervalMonths=1}){
  const[tab,setTab]=useState(pattern?pattern.type:"none");
  const[fixedDay,setFixedDay]=useState(pattern?.type==="day"?pattern.day:5);
  const[nth,setNth]=useState(pattern?.type==="weekday"?pattern.nth:2);
  const[weekday,setWeekday]=useState(pattern?.type==="weekday"?pattern.weekday:6);
  useEffect(()=>{
    if(tab==="none")setPattern(null);
    else if(tab==="day")setPattern({type:"day",day:fixedDay});
    else setPattern({type:"weekday",nth,weekday});
  },[tab,fixedDay,nth,weekday]);
  const preview=useMemo(()=>{
    if(tab==="none")return[];
    const p=tab==="day"?{type:"day",day:fixedDay}:{type:"weekday",nth,weekday};
    return calcFixedSchedule(p,intervalMonths,4);
  },[tab,fixedDay,nth,weekday,intervalMonths]);
  const tabs=[{k:"none",l:"指定なし",icon:"calendar"},{k:"day",l:"毎月○日",icon:"pin"},{k:"weekday",l:"第○曜日",icon:"calFix"}];
  return(
    <div>
      <div role="tablist" style={{display:"flex",gap:4,marginBottom:12,background:T.raised,borderRadius:8,padding:3,border:`1px solid ${T.border}`}}>
        {tabs.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} className="hbtn" role="tab" aria-selected={tab===t.k}
            style={{flex:1,padding:"7px 4px",borderRadius:6,background:tab===t.k?T.card:"transparent",border:tab===t.k?`1px solid ${T.primaryBorder}`:"1px solid transparent",fontSize:9,fontWeight:tab===t.k?700:500,color:tab===t.k?T.primaryDark:T.textMeta,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:4,minHeight:46,transition:"all 0.15s",boxShadow:tab===t.k?"0 1px 4px rgba(168,120,128,0.1)":"none"}}>
            <Ic d={ic[t.icon]} size={12} color={tab===t.k?T.primary:T.textMeta} sw={1.6}/>
            {t.l}
          </button>
        ))}
      </div>
      {tab==="none"&&<div style={{background:T.raised,borderRadius:9,padding:"14px",border:`1px solid ${T.border}`,textAlign:"center"}}><Ic d={ic.calendar} size={22} color={T.textMeta}/><p style={{fontSize:11,fontWeight:700,color:T.textSub,margin:"7px 0 3px"}}>都度カレンダーで指定</p><p style={{fontSize:9,color:T.textMeta,margin:0,lineHeight:1.6}}>固定スケジュールは設定しません</p></div>}
      {tab==="day"&&<div>
        <p style={{fontSize:9,fontWeight:700,color:T.textMeta,marginBottom:8,letterSpacing:0.6,textTransform:"uppercase"}}>お届け日</p>
        <div role="radiogroup" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,marginBottom:10}}>
          {FIXED_DAYS.map(d=>(
            <button key={d} onClick={()=>setFixedDay(d)} className="hbtn" role="radio" aria-checked={fixedDay===d}
              style={{padding:"9px 4px",borderRadius:8,border:`1.5px solid ${fixedDay===d?T.primary:T.border}`,background:fixedDay===d?T.primaryXLight:T.card,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:1,minHeight:46,transition:"all 0.15s",boxShadow:fixedDay===d?"0 2px 8px rgba(168,120,128,0.14)":"none"}}>
              <span style={{fontSize:17,fontWeight:fixedDay===d?800:500,color:fixedDay===d?T.primaryDark:T.text,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{d}</span>
              <span style={{fontSize:8,color:fixedDay===d?T.primary:T.textMeta}}>日</span>
            </button>
          ))}
        </div>
        <div style={{background:T.primaryXLight,borderRadius:8,padding:"7px 10px",border:`1px solid ${T.primaryBorder}`}}>
          <p style={{fontSize:9,color:T.primary,fontWeight:700,margin:"0 0 2px"}}>設定内容</p>
          <p style={{fontSize:12,fontWeight:700,color:T.primaryDark,margin:0,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>毎月{fixedDay}日（{intervalMonths}ヶ月おき）</p>
        </div>
      </div>}
      {tab==="weekday"&&<div>
        <p style={{fontSize:9,fontWeight:700,color:T.textMeta,marginBottom:7,letterSpacing:0.6,textTransform:"uppercase"}}>何番目？</p>
        <div role="radiogroup" style={{display:"flex",gap:4,marginBottom:10}}>
          {NTH_VALUES.map((n,i)=>(
            <button key={n} onClick={()=>setNth(n)} className="hbtn" role="radio" aria-checked={nth===n}
              style={{flex:1,padding:"7px 2px",borderRadius:7,border:`1.5px solid ${nth===n?T.primary:T.border}`,background:nth===n?T.primaryXLight:T.card,fontSize:10,fontWeight:nth===n?700:500,color:nth===n?T.primaryDark:T.textSub,cursor:"pointer",fontFamily:"inherit",minHeight:34,transition:"all 0.15s"}}>
              {NTH_NAMES[i]}
            </button>
          ))}
        </div>
        <p style={{fontSize:9,fontWeight:700,color:T.textMeta,marginBottom:7,letterSpacing:0.6,textTransform:"uppercase"}}>何曜日？</p>
        <div role="radiogroup" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:10}}>
          {WEEKDAY_NAMES.map((name,i)=>(
            <button key={i} onClick={()=>setWeekday(i)} className="hbtn" role="radio" aria-checked={weekday===i}
              style={{padding:"8px 2px",borderRadius:7,border:`1.5px solid ${weekday===i?T.primary:T.border}`,background:weekday===i?T.primaryXLight:T.card,fontSize:12,fontWeight:weekday===i?800:400,color:weekday===i?T.primaryDark:i===0?"#E07070":i===6?T.info:T.text,cursor:"pointer",fontFamily:"inherit",minHeight:38,transition:"all 0.15s"}}>
              {name}
            </button>
          ))}
        </div>
        <div style={{background:T.primaryXLight,borderRadius:8,padding:"7px 10px",border:`1px solid ${T.primaryBorder}`}}>
          <p style={{fontSize:9,color:T.primary,fontWeight:700,margin:"0 0 2px"}}>設定内容</p>
          <p style={{fontSize:12,fontWeight:700,color:T.primaryDark,margin:0,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{NTH_NAMES[nth-1]}{WEEKDAY_NAMES[weekday]}曜日（{intervalMonths}ヶ月おき）</p>
        </div>
      </div>}
      {preview.length>0&&<div style={{marginTop:12}}>
        <p style={{fontSize:9,fontWeight:700,color:T.textMeta,letterSpacing:0.6,textTransform:"uppercase",marginBottom:7}}>スケジュールプレビュー</p>
        <div style={{background:T.card,borderRadius:8,border:`1px solid ${T.border}`,overflow:"hidden"}}>
          {preview.map((d,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 11px",borderBottom:i<preview.length-1?`1px solid ${T.border}`:"none",background:i===0?T.primaryXLight:"transparent"}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:8,color:i===0?T.primary:T.textMeta,border:`1px solid ${i===0?T.primaryBorder:T.border}`,padding:"0 5px",borderRadius:99,fontWeight:700}}>第{i+1}回</span>
                <span style={{fontSize:11,fontWeight:i===0?700:400,color:i===0?T.text:T.textSub,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{fmtDS(d)}</span>
              </div>
              {i===0&&<Badge color={T.primary} bg={T.primaryLight} border={T.primaryBorder} small dot>次回</Badge>}
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  お届け日変更シート（最短・最長・1回お休み＋発送日手動変更）
// ══════════════════════════════════════════════════════
function SheetDate({sub,onClose,onDone}){
  const[date,setDate]=useState(sub.nextDate);
  const[loading,setLoading]=useState(false);
  const[showShipEdit,setShowShipEdit]=useState(false);
  const[showShipDetail,setShowShipDetail]=useState(false);
  const[customShip,setCustomShip]=useState(null);
  const[noArrival,setNoArrival]=useState(false);
  const[applyMeta,setApplyMeta]=useState("");
  const[nowTs,setNowTs]=useState(Date.now());
  const[showException,setShowException]=useState(false);
  const[exceptionReason,setExceptionReason]=useState("");
  const[exceptionMemo,setExceptionMemo]=useState("");

  useEffect(()=>{const id=setInterval(()=>setNowTs(Date.now()),1000);return()=>clearInterval(id);},[]);

  const jst=useMemo(()=>getJstNowParts(nowTs),[nowTs]);
  const today_str=jst.date;
  const maxDate=addMonths(today_str,6);
  const autoShip=!noArrival&&date?calcShip(date):null;
  const shipDate=customShip||autoShip;
  const late=shipDate?shipDate>DEADLINE:false;
  const skipDate=addMonths(sub.nextDate,sub.months);
  const quickOpts=[
    {key:"earliest",label:"最短",desc:`${fmtDS(addDays(today_str,7))}`,icon:"zap",date:addDays(today_str,7)},
    {key:"skip",label:"1回お休み",desc:`${sub.months}ヶ月スキップ`,icon:"skipFwd",date:skipDate},
    {key:"latest",label:"最長",desc:`${fmtDS(maxDate)}`,icon:"moon",date:maxDate},
  ];
  const selQuick=!noArrival?(quickOpts.find(o=>o.date===date)?.key||null):null;

  const cutoffSec=(13*60*60)-(jst.hour*60*60+jst.minute*60+jst.second);
  const isAfterCutoff=cutoffSec<=0;
  const todayArrival=calcArrivalFromShip(today_str);

  const leadBizDays=useMemo(()=>{
    if(!shipDate||!date||noArrival)return null;
    const s=new Date(shipDate),e=new Date(date);
    if(Number.isNaN(+s)||Number.isNaN(+e))return null;
    if(s>=e)return 0;
    const d=new Date(s);let n=0;
    while(d<e){d.setDate(d.getDate()+1);if(d.getDay()!==0&&d.getDay()!==6)n++;}
    return n;
  },[shipDate,date,noArrival]);
  const applyResult=sub?.child?.editable
    ? "今回の次回注文に反映しました。"
    : "今回は確定済みのため、次回注文から反映します。";

  const commitDate=(target,meta)=>{
    setLoading(true);
    setTimeout(()=>{
      setLoading(false);
      if(target){
        onDone(meta?`次回注文を変更しました（${meta}）。${applyResult}`:`次回注文を変更しました。${applyResult}`);
        return;
      }
      onDone(meta?`次回注文を更新しました（お届け予定日：指定なし）（${meta}）。${applyResult}`:`次回注文を更新しました（お届け予定日：指定なし）。${applyResult}`);
    },800);
  };

  const runTodayShipNormal=()=>{
    setNoArrival(false);
    setDate(todayArrival);
    setCustomShip(today_str);
    setShowShipEdit(false);
    setShowException(false);
    setApplyMeta("本日発送");
  };

  const canExceptionSubmit=exceptionReason&&!(exceptionReason==="その他"&&!exceptionMemo.trim());
  const runTodayShipException=()=>{
    if(!canExceptionSubmit)return;
    const detail=exceptionReason==="その他"?exceptionMemo.trim():exceptionReason;
    setNoArrival(false);
    setDate(todayArrival);
    setCustomShip(today_str);
    setShowShipEdit(false);
    setShowException(false);
    setExceptionReason("");
    setExceptionMemo("");
    setApplyMeta(`13時以降例外:${detail}`);
  };

  const toggleNoArrival=(checked)=>{
    setNoArrival(checked);
    setApplyMeta("");
    setShowShipDetail(false);
    setShowException(false);
    if(checked){
      setDate(null);
      if(!customShip)setShowShipEdit(true);
    }else if(!date){
      setDate(sub.nextDate);
    }
  };

  const canSubmit=(noArrival?!!shipDate:!!date)&&!loading;
  const leadShort=noArrival?"空白発送":leadBizDays!==null?`${leadBizDays}営業日`:"—";

  return(
    <Sheet title="お届け日変更" iconKey="calendar" onClose={onClose}>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
        <label style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:9,color:T.textMeta,cursor:"pointer",userSelect:"none"}}>
          <input type="checkbox" checked={noArrival} onChange={e=>toggleNoArrival(e.target.checked)} style={{accentColor:T.primary}}/>
          お届け予定日の指定なし（空白）
        </label>
      </div>

      {!noArrival&&(<>
        <p style={{fontSize:9,fontWeight:700,color:T.textMeta,marginBottom:8,letterSpacing:0.6,textTransform:"uppercase"}}>クイック選択</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:14}}>
          {quickOpts.map(o=>(
            <button key={o.key} onClick={()=>{setNoArrival(false);setDate(o.date);setCustomShip(null);setApplyMeta("");}} className="hbtn"
              style={{padding:"9px 6px",borderRadius:9,border:`1.5px solid ${selQuick===o.key?T.primary:T.border}`,background:selQuick===o.key?T.primaryXLight:T.card,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all 0.15s",boxShadow:selQuick===o.key?"0 2px 8px rgba(168,120,128,0.14)":"none"}}>
              <div style={{width:26,height:26,borderRadius:7,background:selQuick===o.key?T.primary:T.raised,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Ic d={ic[o.icon]} size={12} color={selQuick===o.key?"#fff":T.textSub} sw={1.7}/>
              </div>
              <p style={{fontSize:11,fontWeight:700,color:selQuick===o.key?T.primaryDark:T.text,margin:0,textAlign:"center"}}>{o.label}</p>
              <p style={{fontSize:8,color:selQuick===o.key?T.primary:T.textMeta,margin:0,textAlign:"center",lineHeight:1.3}}>{o.desc}</p>
            </button>
          ))}
        </div>
        <p style={{fontSize:9,fontWeight:700,color:T.textMeta,marginBottom:7,letterSpacing:0.6,textTransform:"uppercase"}}>カレンダーから選択（最長6ヶ月後まで）</p>
        <MiniCal value={date} onChange={v=>{setNoArrival(false);setDate(v);setCustomShip(null);setApplyMeta("");}} maxDate={maxDate} markerDate={shipDate} markerTone={late?"warning":"success"}/>
        {date&&<p style={{fontSize:13,fontWeight:700,color:T.primaryDark,textAlign:"center",padding:"7px 0 2px",fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{fmtD(date)}</p>}
      </>)}

      {noArrival&&(
        <div style={{background:T.raised,border:`1px solid ${T.border}`,borderRadius:9,padding:"9px 10px",marginBottom:10}}>
          <p style={{fontSize:10,fontWeight:700,color:T.textSub,margin:0}}>お届け予定日：指定なし（空白）</p>
        </div>
      )}

      {(date||noArrival)&&(
        <div style={{background:shipDate?(late?T.warningBg:T.successBg):T.raised,borderRadius:9,border:`1px solid ${shipDate?(late?T.warningBorder:T.successBorder):T.border}`,padding:"9px 12px",margin:"10px 0 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
              <div style={{width:20,height:20,borderRadius:6,background:shipDate?(late?T.warning:T.success):T.raised,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Ic d={ic.truck} size={10} color={shipDate?"#fff":T.textMeta} sw={1.7}/>
              </div>
              <p style={{fontSize:10,fontWeight:700,color:shipDate?(late?T.warning:T.success):T.textSub,margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                発送日 {shipDate?fmtMD(shipDate):"未選択"} ・ リードタイム {leadShort} ・ 締切 13:00
              </p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <button onClick={()=>setShowShipEdit(!showShipEdit)} className="hbtn"
                style={{fontSize:9,color:T.primary,fontWeight:700,background:T.primaryXLight,border:`1px solid ${T.primaryBorder}`,padding:"3px 8px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                {showShipEdit?"閉じる":"発送日変更"}
              </button>
              <button onClick={()=>setShowShipDetail(v=>!v)} className="hbtn"
                style={{fontSize:9,color:T.primary,fontWeight:700,background:T.surface,border:`1px solid ${T.border}`,padding:"3px 8px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                {showShipDetail?"詳細閉じる":"詳細"}
              </button>
            </div>
          </div>
          {customShip&&<button onClick={()=>{setCustomShip(null);setApplyMeta("");}} className="hbtn" style={{fontSize:9,color:T.textMeta,background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",marginTop:4,padding:0}}>↺ 自動計算に戻す</button>}
          {!sub?.child?.editable&&<p style={{fontSize:8,color:T.textMeta,margin:"5px 0 0"}}>※ 今回は確定済みのため、次回注文から反映されます</p>}
        </div>
      )}

      {showShipEdit&&(
        <div style={{marginTop:10,padding:"12px",background:T.raised,borderRadius:9,border:`1px solid ${T.border}`}}>
          <p style={{fontSize:10,fontWeight:700,color:T.textSub,marginBottom:8}}>発送日を手動で変更</p>
          <MiniCal value={customShip||autoShip||today_str} onChange={v=>{setCustomShip(v);setShowShipEdit(false);setApplyMeta("");}}/>
        </div>
      )}

      {showShipDetail&&(
        <div style={{background:isAfterCutoff?T.warningBg:T.successBg,borderRadius:9,border:`1px solid ${isAfterCutoff?T.warningBorder:T.successBorder}`,padding:"9px 10px",marginTop:10,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
              <Ic d={isAfterCutoff?ic.alertTri:ic.truck} size={12} color={isAfterCutoff?T.warning:T.success} sw={1.7}/>
              <p style={{fontSize:10,fontWeight:700,color:isAfterCutoff?T.warning:T.success,margin:0}}>{isAfterCutoff?"13:00以降は例外理由が必要":"13:00まで本日発送を反映可能"}</p>
            </div>
            {!isAfterCutoff?(
              <button onClick={runTodayShipNormal} disabled={loading} className="hbtn"
                style={{padding:"6px 9px",borderRadius:7,border:"none",background:T.success,color:"#fff",fontSize:10,fontWeight:700,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",whiteSpace:"nowrap",opacity:loading?0.6:1}}>
                本日発送を反映
              </button>
            ):(
              <button onClick={()=>setShowException(v=>!v)} className="hbtn"
                style={{padding:"6px 9px",borderRadius:7,border:`1px solid ${T.warningBorder}`,background:T.warningBg,color:T.warning,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                {showException?"例外入力を閉じる":"例外を反映"}
              </button>
            )}
          </div>
          <p style={{fontSize:8,color:T.textMeta,margin:"6px 0 0"}}>※ 反映後に「変更を確定する」で保存</p>
        </div>
      )}

      {showShipDetail&&showException&&isAfterCutoff&&(
        <div style={{background:T.raised,border:`1px solid ${T.warningBorder}`,borderRadius:9,padding:"10px",marginBottom:12}}>
          <p style={{fontSize:10,fontWeight:700,color:T.warning,margin:"0 0 7px"}}>13時以降の例外理由（必須）</p>
          <div role="radiogroup" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:8}}>
            {["顧客希望","上長承認","出荷都合","その他"].map(r=>(
              <button key={r} onClick={()=>setExceptionReason(r)} className="hbtn" role="radio" aria-checked={exceptionReason===r}
                style={{padding:"7px 6px",borderRadius:7,border:`1.5px solid ${exceptionReason===r?T.warning:T.border}`,background:exceptionReason===r?T.warningBg:T.card,fontSize:10,fontWeight:700,color:exceptionReason===r?T.warning:T.textSub,cursor:"pointer",fontFamily:"inherit"}}>
                {r}
              </button>
            ))}
          </div>
          {exceptionReason==="その他"&&(
            <textarea value={exceptionMemo} onChange={e=>setExceptionMemo(e.target.value)} placeholder="理由を入力（必須）" rows={3}
              style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface,resize:"vertical",marginBottom:8}}/>
          )}
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>setShowException(false)} className="hbtn" style={{flex:1,padding:"9px 0",borderRadius:8,border:`1px solid ${T.border}`,background:T.card,color:T.textSub,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>閉じる</button>
            <button onClick={runTodayShipException} disabled={!canExceptionSubmit||loading} className={canExceptionSubmit&&!loading?"hbtn":""}
              style={{flex:1.4,padding:"9px 0",borderRadius:8,border:`1px solid ${T.warningBorder}`,background:canExceptionSubmit&&!loading?T.warningBg:T.raised,color:canExceptionSubmit&&!loading?T.warning:T.textMeta,fontSize:10,fontWeight:700,cursor:canExceptionSubmit&&!loading?"pointer":"not-allowed",fontFamily:"inherit"}}>
              例外を反映
            </button>
          </div>
        </div>
      )}

      <div style={{height:12}}/>
      <Btn label="変更を確定する" iconKey="check" variant="primary"
        onClick={()=>commitDate(noArrival?null:date,applyMeta||null)} disabled={!canSubmit} isLoading={loading}/>
    </Sheet>
  );
}

// ── 時間帯変更 ──
function SheetTime({sub,onClose,onDone}){
  const[sel,setSel]=useState(sub.timeSlot);
  const applyResult=sub?.child?.editable
    ? "今回の次回注文に反映しました。"
    : "今回は確定済みのため、次回注文から反映します。";
  return(
    <Sheet title="時間帯変更" iconKey="clock" onClose={onClose}>
      <div role="radiogroup" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:12}}>
        {["午前中","12-14時","14-16時","16-18時","18-20時","19-21時"].map(s=>(
          <button key={s} onClick={()=>setSel(s)} className="hbtn" role="radio" aria-checked={sel===s}
            style={{padding:"11px 8px",borderRadius:9,border:`1.5px solid ${sel===s?T.primary:T.border}`,background:sel===s?T.primaryXLight:T.card,fontSize:11,fontWeight:sel===s?700:500,color:sel===s?T.primaryDark:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5,minHeight:42,transition:"all 0.14s"}}>
            {sel===s&&<Ic d={ic.check} size={10} color={T.primary} sw={2}/>}{s}
          </button>
        ))}
      </div>
      <Btn label="変更を確定する" iconKey="check" variant="primary" onClick={()=>onDone(`時間帯を更新しました。${applyResult}`)}/>
    </Sheet>
  );
}

// ── 配送先変更 ──
function SheetAddress({customer,sub,onClose,onDone}){
  const[vals,setVals]=useState(()=>({
    zip:"",pref:"",addr:"",bldg:"",name:customer?.name||"",kana:customer?.kana||"",
  }));
  const[loading,setLoading]=useState(false);
  const[hint,setHint]=useState("郵便番号入力後に「自動入力」で住所候補を反映できます");
  const fields=[
    {k:"zip",  l:"郵便番号",     ph:"150-0001"},
    {k:"pref", l:"都道府県",     ph:"東京都"},
    {k:"addr", l:"市区町村・番地",ph:"渋谷区1-2-3"},
    {k:"bldg", l:"建物名（任意）",ph:"コーポ渋谷202"},
    {k:"name", l:"お名前",       ph:"山田 花子"},
    {k:"kana", l:"フリガナ（任意）",ph:"ヤマダ ハナコ"},
  ];
  const canSubmit=vals.zip.trim()&&vals.pref.trim()&&vals.addr.trim()&&vals.name.trim();
  const applyResult=sub
    ? (sub?.child?.editable
        ? "今回の次回注文に反映しました。"
        : "今回は確定済みのため、次回注文から反映します。")
    : "";
  const applyZipLookup=()=>{
    const n=vals.zip.replace(/[^0-9]/g,"");
    if(n.length!==7){
      setHint("郵便番号は7桁で入力してください");
      return;
    }
    const zip=`${n.slice(0,3)}-${n.slice(3,7)}`;
    const hit=ZIP_LOOKUP[zip];
    if(!hit){
      setHint("郵便番号の候補が見つかりませんでした");
      return;
    }
    setVals(p=>({...p,zip,pref:hit.pref,addr:hit.addr,bldg:p.bldg||hit.bldg||""}));
    setHint(`住所候補を反映しました（${zip}）`);
  };
  return(
    <Sheet title="配送先変更" iconKey="truck" onClose={onClose}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
        <button onClick={()=>{setVals(p=>({...p,name:customer?.name||p.name,kana:customer?.kana||p.kana}));setHint("顧客情報から氏名を反映しました");}} className="hbtn"
          style={{padding:"8px 8px",borderRadius:8,border:`1px solid ${T.border}`,background:T.raised,cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:700,color:T.textSub}}>
          顧客情報を反映
        </button>
        <button onClick={applyZipLookup} className="hbtn"
          style={{padding:"8px 8px",borderRadius:8,border:`1px solid ${T.primaryBorder}`,background:T.primaryXLight,cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:700,color:T.primaryDark}}>
          郵便番号で自動入力
        </button>
      </div>
      <div style={{background:T.infoBg,border:`1px solid ${T.infoBorder}`,borderRadius:8,padding:"6px 9px",marginBottom:10}}>
        <p style={{fontSize:9,color:T.info,fontWeight:700,margin:0}}>{hint}</p>
      </div>
      {fields.map(f=>(
        <div key={f.k} style={{marginBottom:9}}>
          <label htmlFor={`af-${f.k}`} style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>{f.l}</label>
          <input id={`af-${f.k}`} value={vals[f.k]} onChange={e=>setVals(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph}
            style={{width:"100%",padding:"9px 11px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:12,fontFamily:"inherit",color:T.text,background:T.surface,transition:"all 0.16s"}}/>
        </div>
      ))}
      <Btn label="配送先を更新する" iconKey="check" variant="primary" isLoading={loading} disabled={!canSubmit}
        onClick={()=>{setLoading(true);setTimeout(()=>{setLoading(false);onDone(sub?`配送先を更新しました。${applyResult}`:`配送先を更新しました（${vals.name}様）`);},900);}}/>
    </Sheet>
  );
}

// ── 登録情報編集 ──
function SheetRegistrationInfo({customer,onClose,onSave,onNotify}){
  const[vals,setVals]=useState(()=>({
    phone:customer?.phone||"",
    email:customer?.email||"",
    address:customer?.address||"",
    memberType:customer?.memberType||"通常会員",
    customerMemo:customer?.customerMemo||"",
    dmOptIn:customer?.dmOptIn??true,
    newsletterOptIn:customer?.newsletterOptIn??true,
    outboundBlocked:customer?.outboundBlocked??false,
  }));
  const[pwIssued,setPwIssued]=useState(false);
  const canSave=Boolean(vals.phone.trim());
  const setField=(k,v)=>setVals(prev=>({...prev,[k]:v}));
  const toggles=[
    {key:"dmOptIn",label:"DM",onLabel:"許可",offLabel:"停止"},
    {key:"newsletterOptIn",label:"メルマガ",onLabel:"許可",offLabel:"停止"},
    {key:"outboundBlocked",label:"アウトバウンド拒否",onLabel:"拒否",offLabel:"許可"},
  ];
  const runIssuePw=()=>{
    setPwIssued(true);
    onNotify("仮PWを発行しました（SMS送信）");
  };
  return(
    <Sheet title="登録情報" iconKey="user" onClose={onClose}>
      <div style={{background:T.raised,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 10px",marginBottom:10}}>
        <p style={{fontSize:9,color:T.textMeta,margin:0}}>顧客マスタ情報をこの画面でまとめて更新します</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <div>
          <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>電話</label>
          <input value={vals.phone} onChange={e=>setField("phone",e.target.value)} placeholder="090-1234-5678"
            style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
        </div>
        <div>
          <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>メール</label>
          <input value={vals.email} onChange={e=>setField("email",e.target.value)} placeholder="sample@example.com"
            style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
        </div>
        <div>
          <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>登録住所</label>
          <input value={vals.address} onChange={e=>setField("address",e.target.value)} placeholder="住所を入力"
            style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
        </div>
        <div>
          <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>会員タイプ</label>
          <select value={vals.memberType} onChange={e=>setField("memberType",e.target.value)}
            style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}>
            {["通常会員","優良会員","休眠会員","法人会員"].map(v=><option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {toggles.map(t=>{
            const isOn=Boolean(vals[t.key]);
            const tone=t.key==="outboundBlocked"?T.warning:T.primary;
            const toneBg=t.key==="outboundBlocked"?T.warningBg:T.primaryXLight;
            const toneBorder=t.key==="outboundBlocked"?T.warningBorder:T.primaryBorder;
            return(
              <button key={t.key} onClick={()=>setField(t.key,!isOn)} className="hbtn"
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",borderRadius:8,border:`1px solid ${isOn?toneBorder:T.border}`,background:isOn?toneBg:T.surface,cursor:"pointer",fontFamily:"inherit"}}>
                <span style={{fontSize:11,fontWeight:700,color:T.textSub}}>{t.label}</span>
                <span style={{fontSize:10,fontWeight:700,color:isOn?tone:T.textMeta}}>{isOn?t.onLabel:t.offLabel}</span>
              </button>
            );
          })}
        </div>
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 10px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <div>
              <p style={{fontSize:10,fontWeight:700,color:T.textSub,margin:0}}>仮PW発行</p>
              <p style={{fontSize:9,color:T.textMeta,margin:"1px 0 0"}}>ログイン案内が必要なときだけ実行</p>
            </div>
            <button onClick={runIssuePw} className="hbtn"
              style={{padding:"7px 10px",borderRadius:8,border:`1px solid ${T.primaryBorder}`,background:T.primaryXLight,color:T.primaryDark,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
              発行する
            </button>
          </div>
          {pwIssued&&<p style={{fontSize:9,color:T.success,fontWeight:700,margin:"6px 0 0"}}>このセッションで発行済み</p>}
        </div>
        <div>
          <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>顧客メモ</label>
          <textarea value={vals.customerMemo} onChange={e=>setField("customerMemo",e.target.value)} placeholder="顧客メモを入力"
            rows={3}
            style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface,resize:"vertical"}}/>
        </div>
      </div>
      <div style={{height:10}}/>
      <Btn label="登録情報を保存する" iconKey="check" variant="primary" onClick={()=>onSave(vals)} disabled={!canSave}/>
    </Sheet>
  );
}

// ── 一時停止 ──
function SheetPause({onClose,onDone}){
  const[reason,setReason]=useState("");
  return(
    <Sheet title="一時停止" iconKey="pause" onClose={onClose}>
      <div style={{background:T.warningBg,border:`1px solid ${T.warningBorder}`,borderRadius:9,padding:"9px 12px",marginBottom:12}}>
        <p style={{fontSize:10,color:T.textSub,margin:0,lineHeight:1.7}}>停止中はお届けがありません。再開はいつでも可能です。</p>
      </div>
      <p style={{fontSize:9,fontWeight:700,color:T.textMeta,marginBottom:7,letterSpacing:0.6,textTransform:"uppercase"}}>停止理由（任意）</p>
      <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:12}}>
        {["在庫が余っている","体調不良","旅行・外出","その他"].map(r=>(
          <button key={r} onClick={()=>setReason(r)} className="hbtn"
            style={{padding:"8px 11px",borderRadius:8,border:`1.5px solid ${reason===r?T.primary:T.border}`,background:reason===r?T.primaryXLight:T.card,fontSize:11,fontWeight:reason===r?700:400,color:T.text,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8,minHeight:38,transition:"all 0.13s"}}>
            {reason===r&&<Ic d={ic.check} size={10} color={T.primary} sw={2}/>}{r}
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:6}}>
        <button onClick={onClose} className="hbtn" style={{flex:1,padding:"10px 0",borderRadius:9,border:`1px solid ${T.border}`,background:T.raised,color:T.textSub,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",minHeight:42}}>やめておく</button>
        <button onClick={()=>onDone("一時停止しました","warning")} className="hbtn" style={{flex:1,padding:"10px 0",borderRadius:9,border:`1px solid ${T.warningBorder}`,background:T.warningBg,color:T.warning,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",minHeight:42}}>停止する</button>
      </div>
    </Sheet>
  );
}

// ── 再開 ──
function SheetResume({sub,onClose,onDone}){
  return(
    <Sheet title="定期を再開する" iconKey="play" onClose={onClose}>
      <div style={{background:T.successBg,border:`1px solid ${T.successBorder}`,borderRadius:9,padding:"10px 12px",marginBottom:14}}>
        <p style={{fontSize:11,fontWeight:700,color:T.success,margin:"0 0 3px"}}>{sub.label}を再開します</p>
        <p style={{fontSize:10,color:T.textSub,margin:0,lineHeight:1.7}}>停止理由：{sub.pauseReason||"—"}　/　停止日：{sub.pausedAt||"—"}</p>
      </div>
      <p style={{fontSize:11,color:T.textSub,lineHeight:1.7,marginBottom:12}}>
        次回お届け予定日 <strong style={{color:T.text}}>{fmtD(sub.nextDate)}</strong> から再開されます。
      </p>
      <div style={{background:T.infoBg,border:`1px solid ${T.infoBorder}`,borderRadius:9,padding:"9px 10px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
          <Ic d={ic.repeat} size={11} color={T.info} sw={1.7}/>
          <p style={{fontSize:10,fontWeight:700,color:T.info,margin:0}}>運用ガイド</p>
        </div>
        <p style={{fontSize:9,color:T.textSub,margin:0,lineHeight:1.6}}>
          商品・コース・日付を変える場合は、まず再開してから変更するのが安全です。
        </p>
        <p style={{fontSize:9,color:T.textMeta,margin:"3px 0 0",lineHeight:1.6}}>
          再開後に次回注文カードの各項目（鉛筆）から変更してください。
        </p>
      </div>
      <Btn label="定期を再開する" iconKey="play" variant="success" onClick={()=>onDone(`「${sub.label}」を再開しました`)}/>
    </Sheet>
  );
}

// ── 解約 ──
function SheetCancel({sub,onClose,onDone}){
  const[confirmed,setConfirmed]=useState(false);
  return(
    <Sheet title="解約" iconKey="trash" onClose={onClose}>
      <div style={{background:T.dangerBg,border:`1px solid ${T.dangerBorder}`,borderRadius:9,padding:"9px 12px",marginBottom:12}}>
        <p style={{fontSize:11,fontWeight:700,color:T.danger,margin:"0 0 3px"}}>この操作は取り消しできません</p>
        <p style={{fontSize:10,color:T.textSub,margin:0,lineHeight:1.7}}>解約すると<strong>{fmtD(sub.nextDate)}以降</strong>のお届けがキャンセルされます。</p>
      </div>
      <label style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",background:T.raised,border:`1px solid ${T.border}`,borderRadius:9,cursor:"pointer",marginBottom:12,userSelect:"none"}}>
        <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} style={{width:14,height:14,accentColor:T.danger,cursor:"pointer"}}/>
        <span style={{fontSize:11,color:T.textSub,fontWeight:600}}>上記を理解し、解約します</span>
      </label>
      <div style={{display:"flex",gap:6}}>
        <button onClick={onClose} className="hbtn" style={{flex:1.2,padding:"10px 0",borderRadius:9,border:`1px solid ${T.border}`,background:T.raised,color:T.textSub,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",minHeight:42}}>やめておく</button>
        <button onClick={()=>onDone("解約処理が完了しました","warning")} disabled={!confirmed} className={confirmed?"hbtn":""}
          style={{flex:1,padding:"10px 0",borderRadius:9,border:`1px solid ${T.dangerBorder}`,background:confirmed?T.dangerBg:T.raised,color:confirmed?T.danger:T.textMeta,fontSize:11,fontWeight:700,cursor:confirmed?"pointer":"not-allowed",fontFamily:"inherit",minHeight:42}}>解約する</button>
      </div>
    </Sheet>
  );
}

// ── 店舗内文言追加シート ──
function SheetStoreNote({onClose,onDone}){
  const[text,setText]=useState("");
  const[type,setType]=useState("general");
  const templates=[
    {key:"stock","label":"在庫確認中","text":"在庫の確認が取れ次第、発送いたします。今しばらくお待ちください。"},
    {key:"delay","label":"お届け遅延","text":"配送の遅延が発生しております。ご不便をおかけし誠に申し訳ございません。"},
    {key:"payment","label":"支払い方法変更","text":"お支払い方法の変更をご希望の場合は、変更用URLをご案内いたします。"},
    {key:"carrier","label":"配送会社案内","text":"配送会社はヤマト運輸です。配送状況は追跡番号でご確認いただけます。"},
    {key:"thanks","label":"ご愛顧感謝","text":"いつも豊潤サジーをご愛顧いただき、誠にありがとうございます。"},
    {key:"confirm","label":"ご確認依頼","text":"お電話またはメールにてご確認させていただきます。今しばらくお待ちください。"},
  ];
  return(
    <Sheet title="店舗内文言追加" iconKey="note" onClose={onClose}>
      <p style={{fontSize:9,fontWeight:700,color:T.textMeta,marginBottom:7,letterSpacing:0.6,textTransform:"uppercase"}}>テンプレート</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:12}}>
        {templates.map(t=>(
          <button key={t.key} onClick={()=>setText(t.text)} className="hbtn"
            style={{padding:"8px 10px",borderRadius:8,border:`1px solid ${T.border}`,background:T.raised,cursor:"pointer",fontFamily:"inherit",textAlign:"left",fontSize:10,fontWeight:600,color:T.text,minHeight:34,transition:"all 0.14s"}}>
            {t.label}
          </button>
        ))}
      </div>
      <p style={{fontSize:9,fontWeight:700,color:T.textMeta,marginBottom:7,letterSpacing:0.6,textTransform:"uppercase"}}>文言を入力</p>
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="顧客への伝達事項を入力…"
        rows={4}
        style={{width:"100%",padding:"10px 11px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:12,fontFamily:"inherit",color:T.text,background:T.surface,resize:"vertical",lineHeight:1.6,transition:"all 0.16s"}}/>
      <p style={{fontSize:9,color:T.textMeta,margin:"4px 0 12px",textAlign:"right"}}>{text.length}文字</p>
      <Btn label="文言を保存する" iconKey="check" variant="primary" disabled={!text.trim()} onClick={()=>onDone("店舗内文言を追加しました")}/>
    </Sheet>
  );
}

// ── 明細行編集シート ──
function SheetLineItemEdit({item,onClose,onSave}){
  const minQty=item?.type==="single_add"?0:1;
  const[qty,setQty]=useState(Math.max(minQty,Number(item?.qty||minQty)));
  const[unitPrice,setUnitPrice]=useState(Math.max(0,Number(item?.price||0)));
  const[remove,setRemove]=useState(false);

  useEffect(()=>{
    const nextMin=item?.type==="single_add"?0:1;
    setQty(Math.max(nextMin,Number(item?.qty||nextMin)));
    setUnitPrice(Math.max(0,Number(item?.price||0)));
    setRemove(false);
  },[item?.name,item?.size,item?.qty,item?.price,item?.type]);

  const qtySafe=Math.min(99,Math.max(minQty,Math.floor(Number(qty)||0)));
  const unitPriceSafe=Math.max(0,Math.floor(Number(unitPrice)||0));
  const lineTotal=qtySafe*unitPriceSafe;
  const canSave=remove||(qtySafe>=minQty&&unitPriceSafe>=0);
  const isSingleAdd=item?.type==="single_add";

  return(
    <Sheet title="明細を編集" iconKey="pen" onClose={onClose}>
      <div style={{background:T.raised,border:`1px solid ${T.border}`,borderRadius:9,padding:"10px 11px",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
          <p style={{fontSize:12,fontWeight:700,color:T.text,margin:0}}>{item?.name||"商品"}</p>
          <span style={{fontSize:10,color:T.textMeta}}>{item?.size||""}</span>
          {isSingleAdd&&<Badge color={T.warning} bg={T.warningBg} border={T.warningBorder} small>単品追加</Badge>}
        </div>
        <p style={{fontSize:9,color:T.textMeta,margin:0}}>行単位で数量と単価を直接編集できます</p>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div>
          <p style={{fontSize:9,fontWeight:700,color:T.textMeta,margin:"0 0 6px",letterSpacing:0.6,textTransform:"uppercase"}}>数量</p>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <button onClick={()=>setQty(Math.max(minQty,qtySafe-1))} disabled={qtySafe<=minQty} className={qtySafe>minQty?"hbtn":""}
              style={{width:28,height:28,borderRadius:"50%",border:`1.5px solid ${qtySafe>minQty?T.primary:T.border}`,background:qtySafe>minQty?T.primary:T.raised,cursor:qtySafe>minQty?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Ic d={ic.minus} size={11} color={qtySafe>minQty?"#fff":T.textMeta} sw={2}/>
            </button>
            <input type="number" min={minQty} max={99} value={qtySafe}
              onChange={e=>setQty(Math.max(minQty,Math.floor(Number(e.target.value)||0)))}
              style={{flex:1,padding:"8px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:12,fontFamily:"inherit",color:T.text,background:T.surface}}/>
            <button onClick={()=>setQty(Math.min(99,qtySafe+1))} disabled={qtySafe>=99} className={qtySafe<99?"hbtn":""}
              style={{width:28,height:28,borderRadius:"50%",border:`1.5px solid ${qtySafe<99?T.primary:T.border}`,background:qtySafe<99?T.primary:T.raised,cursor:qtySafe<99?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Ic d={ic.plus} size={11} color={qtySafe<99?"#fff":T.textMeta} sw={2}/>
            </button>
          </div>
        </div>

        <div>
          <p style={{fontSize:9,fontWeight:700,color:T.textMeta,margin:"0 0 6px",letterSpacing:0.6,textTransform:"uppercase"}}>単価</p>
          <input type="number" min={0} step={1} value={unitPriceSafe}
            onChange={e=>setUnitPrice(Math.max(0,Math.floor(Number(e.target.value)||0)))}
            style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:12,fontFamily:"inherit",color:T.text,background:T.surface}}/>
        </div>
      </div>

      {isSingleAdd&&(
        <label style={{display:"flex",alignItems:"center",gap:7,padding:"8px 10px",marginTop:10,borderRadius:8,border:`1px solid ${T.border}`,background:T.surface,cursor:"pointer",userSelect:"none"}}>
          <input type="checkbox" checked={remove} onChange={e=>setRemove(e.target.checked)} style={{accentColor:T.warning}}/>
          <span style={{fontSize:10,color:T.textSub}}>この単品追加を明細から削除する</span>
        </label>
      )}

      <div style={{marginTop:12,background:T.primaryXLight,border:`1px solid ${T.primaryBorder}`,borderRadius:8,padding:"9px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:10,fontWeight:700,color:T.textSub}}>小計</span>
        <span style={{fontSize:16,fontWeight:800,color:T.primaryDark,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{remove?"削除予定":fmtP(lineTotal)}</span>
      </div>

      <div style={{display:"flex",gap:7,marginTop:12}}>
        <button onClick={onClose} className="hbtn"
          style={{flex:1,padding:"10px 0",borderRadius:9,border:`1px solid ${T.border}`,background:T.raised,color:T.textSub,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",minHeight:42}}>
          戻る
        </button>
        <button onClick={()=>onSave(remove?{remove:true}:{qty:qtySafe,price:unitPriceSafe})} disabled={!canSave} className={canSave?"hbtn":""}
          style={{flex:1.4,padding:"10px 0",borderRadius:9,border:"none",background:canSave?T.primary:T.raised,color:canSave?"#fff":T.textMeta,fontSize:11,fontWeight:700,cursor:canSave?"pointer":"not-allowed",fontFamily:"inherit",minHeight:42,boxShadow:canSave?"0 2px 12px rgba(168,120,128,0.25)":"none"}}>
          保存する
        </button>
      </div>
    </Sheet>
  );
}

// ── ポイント利用編集シート ──
function SheetPointsEdit({value,onClose,onSave}){
  const[points,setPoints]=useState(Math.max(0,Math.floor(Number(value||0))));
  useEffect(()=>{setPoints(Math.max(0,Math.floor(Number(value||0))));},[value]);
  const safePoints=Math.max(0,Math.floor(Number(points)||0));
  const quickValues=[0,500,1000,2000];
  return(
    <Sheet title="ポイント利用を編集" iconKey="receipt" onClose={onClose}>
      <p style={{fontSize:9,fontWeight:700,color:T.textMeta,marginBottom:7,letterSpacing:0.6,textTransform:"uppercase"}}>利用ポイント（円換算）</p>
      <input type="number" min={0} step={1} value={safePoints}
        onChange={e=>setPoints(Math.max(0,Math.floor(Number(e.target.value)||0)))}
        style={{width:"100%",padding:"9px 11px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:13,fontWeight:700,fontFamily:"inherit",color:T.text,background:T.surface}}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginTop:8}}>
        {quickValues.map(v=>(
          <button key={v} onClick={()=>setPoints(v)} className="hbtn"
            style={{padding:"7px 0",borderRadius:7,border:`1px solid ${safePoints===v?T.primaryBorder:T.border}`,background:safePoints===v?T.primaryXLight:T.card,fontSize:10,fontWeight:700,color:safePoints===v?T.primaryDark:T.textSub,cursor:"pointer",fontFamily:"inherit"}}>
            {v===0?"なし":`¥${v.toLocaleString()}`}
          </button>
        ))}
      </div>
      <div style={{marginTop:11,background:T.warningBg,border:`1px solid ${T.warningBorder}`,borderRadius:8,padding:"8px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:10,color:T.textSub}}>今回の値引き</span>
        <span style={{fontSize:14,fontWeight:800,color:T.warning,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{safePoints>0?`-¥${safePoints.toLocaleString()}`:"¥0"}</span>
      </div>
      <div style={{display:"flex",gap:7,marginTop:12}}>
        <button onClick={onClose} className="hbtn"
          style={{flex:1,padding:"10px 0",borderRadius:9,border:`1px solid ${T.border}`,background:T.raised,color:T.textSub,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",minHeight:42}}>
          戻る
        </button>
        <button onClick={()=>onSave(safePoints)} className="hbtn"
          style={{flex:1.3,padding:"10px 0",borderRadius:9,border:"none",background:T.primary,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",minHeight:42,boxShadow:"0 2px 12px rgba(168,120,128,0.25)"}}>
          保存する
        </button>
      </div>
    </Sheet>
  );
}

// ── サイクル変更ウィザード ──
function SheetFreqWizard({sub,onClose,onDone}){
  const TOTAL=4;
  const[step,setStep]=useState(1);
  const[freqKey,setFreqKey]=useState(null);
  const[datePattern,setDatePattern]=useState(sub.datePattern||null);
  const[manualDate,setManualDate]=useState(sub.nextDate);
  const[override,setOverride]=useState(null);
  const[apiState,setApiState]=useState("idle");
  const applyResult=sub?.child?.editable
    ? "今回の次回注文に反映しました。"
    : "今回は確定済みのため、次回注文から反映します。";
  const fd=FREQ_MAP.find(f=>f.key===freqKey);
  const active=override||fd;
  const intervalMonths=fd?.months||sub.months||1;
  const nextDate=useMemo(()=>datePattern?calcFixedSchedule(datePattern,intervalMonths,1)[0]:manualDate,[datePattern,manualDate,intervalMonths]);
  const ship=nextDate?calcShip(nextDate):null;
  const late=ship?ship>DEADLINE:false;
  const sched=useMemo(()=>{
    if(!fd)return[];
    if(datePattern)return calcFixedSchedule(datePattern,intervalMonths,4).slice(1);
    return Array.from({length:3},(_,i)=>addDays(nextDate,fd.months*30*(i+1)));
  },[datePattern,manualDate,fd,intervalMonths,nextDate]);
  const diff={freq:freqKey&&freqKey!==sub.freqKey,date:nextDate!==sub.nextDate,pattern:JSON.stringify(datePattern)!==JSON.stringify(sub.datePattern),course:active&&active.course!==sub.course};
  const any=diff.freq||diff.date||diff.pattern||diff.course;
  function DRow({ik,label,from,to,changed,s}){
    return(
      <div style={{padding:"8px 10px",borderRadius:8,background:changed?T.primaryXLight:T.raised,border:`1px solid ${changed?T.primaryBorder:T.border}`,transition:"all 0.18s"}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <Ic d={ic[ik]} size={11} color={changed?T.primary:T.textMeta} sw={1.6}/>
          <span style={{fontSize:9,color:T.textMeta,width:52,flexShrink:0}}>{label}</span>
          <span style={{fontSize:9,color:T.textMeta,textDecoration:"line-through",flexShrink:0,maxWidth:52,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{from}</span>
          <span style={{fontSize:9,color:T.textDim}}>→</span>
          <span style={{fontSize:11,fontWeight:changed?700:400,color:changed?T.primaryDark:T.textSub,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{to}</span>
          <Badge color={changed?T.primary:T.textMeta} bg={changed?T.primaryLight:T.raised} small>{changed?"変更":"同じ"}</Badge>
        </div>
        {s&&<p style={{fontSize:9,color:T.textMeta,margin:"2px 0 0 18px"}}>{s}</p>}
      </div>
    );
  }
  const execute=()=>{setApiState("loading");setTimeout(()=>{setApiState("idle");onDone(`コース・サイクルを変更しました。${applyResult}`);},1000);};
  const bar=<div role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL} style={{display:"flex",gap:4,marginBottom:14}}>
    {Array.from({length:TOTAL}).map((_,i)=>(
      <div key={i} style={{height:2.5,borderRadius:99,transition:"all 0.35s cubic-bezier(0.4,0,0.2,1)",flex:i===step-1?2:1,background:i<step-1?T.success:i===step-1?T.primary:T.border}}/>
    ))}
  </div>;
  return(
    <Sheet title={`コース・サイクル変更 ${step}/${TOTAL}`} iconKey="sync" onClose={onClose}>
      {bar}
      {apiState==="error"&&step===4&&<div style={{marginBottom:12}}><ErrorBlock type="saveFail" onRetry={()=>setApiState("idle")}/></div>}
      {step===1&&(<>
        <p style={{fontSize:11,fontWeight:700,color:T.textSub,marginBottom:10}}>コースを決める間隔を選ぶ</p>
        <div role="radiogroup" style={{display:"flex",flexDirection:"column",gap:5,marginBottom:10}}>
          {FREQ_MAP.map(f=>(
            <button key={f.key} onClick={()=>setFreqKey(f.key)} className="hbtn" role="radio" aria-checked={freqKey===f.key}
              style={{padding:"9px 12px",borderRadius:9,textAlign:"left",border:`1.5px solid ${freqKey===f.key?T.primary:T.border}`,background:freqKey===f.key?T.primaryXLight:T.card,cursor:"pointer",fontFamily:"inherit",display:"flex",justifyContent:"space-between",alignItems:"center",minHeight:48,transition:"all 0.15s",boxShadow:freqKey===f.key?"0 2px 8px rgba(168,120,128,0.1)":"none"}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <p style={{fontSize:13,fontWeight:freqKey===f.key?700:500,color:freqKey===f.key?T.primaryDark:T.text,margin:0,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{f.label}</p>
                  {f.current&&<Badge color={T.primary} bg={T.primaryLight} border={T.primaryBorder} small>現在</Badge>}
                </div>
                <p style={{fontSize:9,color:T.textMeta,margin:"1px 0 0"}}>→ {f.course} / {fmtP(f.price)}</p>
              </div>
              {freqKey===f.key&&<Ic d={ic.check} size={14} color={T.primary} sw={2}/>}
            </button>
          ))}
        </div>
        <Nav canNext={!!freqKey} onNext={()=>setStep(2)} label="次へ →"/>
      </>)}
      {step===2&&(<>
        <p style={{fontSize:11,fontWeight:700,color:T.textSub,marginBottom:10}}>お届け日の設定方法</p>
        <DatePatternSelector pattern={datePattern} setPattern={setDatePattern} intervalMonths={intervalMonths}/>
        {!datePattern&&(<><div style={{height:1,background:T.border,margin:"12px 0"}}/>
          <p style={{fontSize:9,fontWeight:700,color:T.textMeta,marginBottom:7,letterSpacing:0.6,textTransform:"uppercase"}}>次回お届け日</p>
          <MiniCal value={manualDate} onChange={v=>setManualDate(v)}/>
          {manualDate&&<p style={{fontSize:12,fontWeight:700,color:T.primaryDark,textAlign:"center",padding:"6px 0 2px",fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{fmtD(manualDate)}</p>}
        </>)}
        {nextDate&&ship&&<div style={{background:late?T.warningBg:T.successBg,borderRadius:8,border:`1px solid ${late?T.warningBorder:T.successBorder}`,padding:"7px 10px",margin:"10px 0 0",display:"flex",gap:7,alignItems:"center"}}>
          <Ic d={late?ic.alertTri:ic.check} size={11} color={late?T.warning:T.success}/>
          <div><p style={{fontSize:10,fontWeight:700,color:late?T.warning:T.success,margin:0}}>{late?"締め切り超過":`発送日：${fmtD(ship)}`}</p><p style={{fontSize:9,color:T.textMeta,margin:"1px 0 0"}}>次回：{fmtDS(nextDate)}</p></div>
        </div>}
        <Nav canNext={true} onBack={()=>setStep(1)} onNext={()=>setStep(3)} label="次へ →"/>
      </>)}
      {step===3&&(<>
        <p style={{fontSize:11,fontWeight:700,color:T.textSub,marginBottom:10}}>コース確認</p>
        {fd&&<div style={{background:T.primaryXLight,border:`1px solid ${T.primaryBorder}`,borderRadius:10,padding:"11px 12px",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:7}}><Ic d={ic.sparkle} size={11} color={T.primary}/><span style={{fontSize:9,fontWeight:700,color:T.primary}}>自動提案</span><Badge color={T.primary} bg={T.primaryLight} border={T.primaryBorder} small>推奨</Badge></div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}><p style={{fontSize:13,fontWeight:700,color:T.text,margin:0,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{fd.course}</p><p style={{fontSize:15,fontWeight:800,color:T.primaryDark,margin:0,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{fmtP(fd.price)}</p></div>
          <button onClick={()=>setOverride(null)} className="hbtn" style={{width:"100%",padding:"7px 0",borderRadius:7,border:`1.5px solid ${!override?T.primary:T.border}`,background:!override?T.primary:T.card,color:!override?"#fff":T.textSub,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",boxShadow:!override?"0 2px 10px rgba(168,120,128,0.25)":"none"}}>{!override?"✓ この提案を使う（選択中）":"この提案を使う"}</button>
        </div>}
        <details><summary className="hbtn" style={{fontSize:10,fontWeight:700,color:override?T.warning:T.textMeta,padding:"5px 0",display:"flex",alignItems:"center",gap:4,minHeight:30}}><Ic d={ic.chevD} size={9} color={override?T.warning:T.textMeta}/>{override?`上書き中：${override.course}`:"例外・OP上書き"}{override&&<Badge color={T.warning} bg={T.warningBg} border={T.warningBorder} small>上書き中</Badge>}</summary>
          <div role="radiogroup" style={{display:"flex",flexDirection:"column",gap:4,paddingTop:7}}>
            {FREQ_MAP.map(f=>(<button key={f.key} onClick={()=>setOverride(f.key===fd?.key?null:f)} className="hbtn" role="radio" aria-checked={override?.key===f.key} style={{padding:"7px 10px",borderRadius:7,border:`1.5px solid ${override?.key===f.key?T.primary:T.border}`,background:override?.key===f.key?T.primaryXLight:T.card,cursor:"pointer",fontFamily:"inherit",display:"flex",justifyContent:"space-between",alignItems:"center",minHeight:36,transition:"all 0.13s"}}><span style={{fontSize:11,color:T.text}}>{f.course}</span><span style={{fontSize:10,color:T.textMeta}}>{fmtP(f.price)}</span></button>))}
          </div>
        </details>
        <Nav canNext={true} onBack={()=>setStep(2)} onNext={()=>setStep(4)} label="次へ →"/>
      </>)}
      {step===4&&(<>
        <p style={{fontSize:11,fontWeight:700,color:T.textSub,marginBottom:9}}>変更を確認して実行</p>
        <div style={{background:T.raised,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 10px",marginBottom:10}}>
          <p style={{fontSize:9,color:T.textMeta,margin:0}}>{applyResult}</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
          <DRow ik="repeat" label="間隔" from={sub.freqLabel} to={fd?.label||sub.freqLabel} changed={diff.freq}/>
          <DRow ik="pin" label="固定パターン" from={patternLabel(sub.datePattern)||"なし"} to={patternLabel(datePattern)||"なし"} changed={diff.pattern}/>
          <DRow ik="calendar" label="次回日" from={fmtD(sub.nextDate)} to={fmtD(nextDate)} changed={diff.date} s={`発送予定：${fmtD(ship)}`}/>
          <DRow ik="layers" label="コース" from={sub.course} to={active?.course||sub.course} changed={diff.course}/>
        </div>
        {sched.length>0&&(<><p style={{fontSize:9,fontWeight:700,color:T.textMeta,letterSpacing:0.6,textTransform:"uppercase",marginBottom:6}}>{datePattern?`固定スケジュール（${patternLabel(datePattern)}）`:"次々回以降"}</p>
          <div style={{background:T.raised,borderRadius:8,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:10}}>
            {sched.map((d,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",borderBottom:i<sched.length-1?`1px solid ${T.border}`:"none"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:8,color:T.textMeta,border:`1px solid ${T.border}`,padding:"0 4px",borderRadius:99,fontWeight:700}}>第{i+2}回</span><span style={{fontSize:11,color:T.text,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{fmtDS(d)}</span></div><span style={{fontSize:9,color:T.textMeta}}>{active?.course||sub.course}</span></div>))}
          </div>
        </>)}
        {!any&&<div role="alert" style={{background:T.infoBg,borderRadius:7,padding:"7px 10px",marginBottom:4}}><p style={{fontSize:10,color:T.info,margin:0}}>変更がありません</p></div>}
        <Nav canNext={any&&apiState!=="error"} onBack={()=>{setStep(3);setApiState("idle");}} onNext={execute} label="✓ 実行する" danger isLoading={apiState==="loading"}/>
      </>)}
    </Sheet>
  );
}

// ── 商品変更シート ──
function SheetProducts({sub,onClose,onDone}){
  const[searchQ,setSearchQ]=useState("");
  const[cart,setCart]=useState(()=>{const m={};(sub.items||[]).forEach(i=>{m[i.productId]={...i};});return m;});
  const[step,setStep]=useState("search");
  const[apiState,setApiState]=useState("idle");
  const applyResult=sub?.child?.editable
    ? "今回の次回注文に反映しました。"
    : "今回は確定済みのため、次回注文から反映します。";
  const searchRef=useRef(null);
  useEffect(()=>{if(step==="search")searchRef.current?.focus();},[step]);
  const filtered=PRODUCTS.filter(p=>!searchQ||p.name.includes(searchQ)||p.size.includes(searchQ)||p.tag.includes(searchQ));
  const setQty=(pid,delta)=>{
    const prod=PRODUCTS.find(p=>p.id===pid);if(!prod?.stock)return;
    setCart(prev=>{const cur=prev[pid]?.qty||0,nxt=Math.max(0,Math.min(cur+delta,prod.maxQty));if(nxt===0){const n={...prev};delete n[pid];return n;}return{...prev,[pid]:{productId:pid,name:prod.name,size:prod.size,qty:nxt,price:prod.price}};});
  };
  const cartItems=Object.values(cart);
  const total=cartItems.reduce((s,i)=>s+i.price*i.qty,0);
  const totalQty=cartItems.reduce((s,i)=>s+i.qty,0);
  const handleConfirm=()=>{setApiState("loading");setTimeout(()=>{setApiState("idle");onDone(`商品を更新しました。${applyResult}`);},1000);};
  if(step==="confirm")return(
    <Sheet title="変更内容の確認" iconKey="cart" onClose={onClose}>
      {apiState==="error"&&<div style={{marginBottom:12}}><ErrorBlock type="saveFail" onRetry={()=>setApiState("idle")}/></div>}
      {cartItems.length===0
        ?<div style={{background:T.warningBg,border:`1px solid ${T.warningBorder}`,borderRadius:8,padding:"10px",textAlign:"center",marginBottom:10}}><p style={{fontSize:11,color:T.warning,fontWeight:700,margin:0}}>商品が選択されていません</p></div>
        :cartItems.map(item=>(<div key={item.productId} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${T.border}`}}><div><p style={{fontSize:12,fontWeight:600,color:T.text,margin:0}}>{item.name}</p><p style={{fontSize:9,color:T.textMeta,margin:"1px 0 0"}}>{item.size}×{item.qty}</p></div><div style={{textAlign:"right"}}><p style={{fontSize:13,fontWeight:700,color:T.primaryDark,margin:0,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{fmtP(item.price*item.qty)}</p><p style={{fontSize:9,color:T.textMeta,margin:"1px 0 0"}}>{fmtP(item.price)}×{item.qty}</p></div></div>))}
      <div style={{background:T.primaryXLight,borderRadius:8,padding:"10px 12px",margin:"9px 0 12px",display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${T.primaryBorder}`}}>
        <span style={{fontSize:11,fontWeight:700,color:T.text}}>合計</span>
        <span style={{fontSize:20,fontWeight:800,color:T.primaryDark,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{fmtP(total)}</span>
      </div>
      <div style={{background:T.raised,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 10px",marginBottom:2}}>
        <p style={{fontSize:9,color:T.textMeta,margin:0}}>{applyResult}</p>
      </div>
      <div style={{display:"flex",gap:7,marginTop:12}}>
        <button onClick={()=>{setApiState("idle");setStep("search");}} className="hbtn" style={{flex:1,padding:"10px 0",borderRadius:9,border:`1px solid ${T.border}`,background:T.raised,color:T.textSub,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",minHeight:42}}>← 戻る</button>
        <button onClick={handleConfirm} disabled={cartItems.length===0||apiState==="loading"} className={cartItems.length>0&&apiState!=="loading"?"hbtn":""} style={{flex:1.5,padding:"10px 0",borderRadius:9,border:"none",background:cartItems.length===0||apiState==="loading"?T.raised:T.primary,color:cartItems.length===0||apiState==="loading"?T.textMeta:"#fff",fontSize:11,fontWeight:700,cursor:cartItems.length===0||apiState==="loading"?"not-allowed":"pointer",fontFamily:"inherit",minHeight:42,display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:cartItems.length>0&&apiState!=="loading"?"0 2px 12px rgba(168,120,128,0.25)":"none"}}>
          {apiState==="loading"&&<Spinner size={12} color="#fff"/>}{apiState==="loading"?"処理中…":"✓ 変更を確定する"}
        </button>
      </div>
    </Sheet>
  );
  return(
    <Sheet title="商品を変更する" iconKey="cart" onClose={onClose}>
      <div style={{position:"relative",marginBottom:10}}>
        <div style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><Ic d={ic.search} size={12} color={T.textMeta}/></div>
        <input ref={searchRef} value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="商品名・サイズで検索" style={{width:"100%",padding:"8px 9px 8px 29px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface,transition:"all 0.16s"}}/>
        {searchQ&&<button onClick={()=>setSearchQ("")} className="hbtn" style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:2,display:"flex",alignItems:"center"}}><Ic d={ic.x} size={11} color={T.textMeta}/></button>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
        {filtered.map(prod=>{
          const qty=cart[prod.id]?.qty||0,outOfStock=!prod.stock;
          return(
            <div key={prod.id} style={{background:outOfStock?T.raised:qty>0?T.primaryXLight:T.card,border:`1.5px solid ${outOfStock?T.border:qty>0?T.primary:T.border}`,borderRadius:10,padding:"10px 11px",opacity:outOfStock?0.5:1,transition:"all 0.18s",boxShadow:qty>0?"0 2px 8px rgba(168,120,128,0.08)":"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3,flexWrap:"wrap"}}>
                    <p style={{fontSize:12,fontWeight:600,color:qty>0?T.text:T.textSub,margin:0}}>{prod.name}</p>
                    <span style={{fontSize:9,color:T.textMeta}}>{prod.size}</span>
                    {prod.tag&&<Badge color={T.primary} bg={T.primaryLight} border={T.primaryBorder} small>{prod.tag}</Badge>}
                    {outOfStock&&<Badge color={T.danger} bg={T.dangerBg} border={T.dangerBorder} small dot>在庫切れ</Badge>}
                    {qty>=prod.maxQty&&qty>0&&<Badge color={T.warning} bg={T.warningBg} border={T.warningBorder} small>上限{prod.maxQty}</Badge>}
                  </div>
                  <div style={{display:"flex",alignItems:"baseline",gap:2}}>
                    <p style={{fontSize:13,fontWeight:700,color:outOfStock?T.textMeta:qty>0?T.primaryDark:T.text,margin:0,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{fmtP(prod.price)}</p>
                    <span style={{fontSize:9,color:T.textMeta}}>/{prod.unit}</span>
                  </div>
                  {qty>0&&<p style={{fontSize:9,color:T.success,fontWeight:700,margin:"2px 0 0"}}>小計：{fmtP(prod.price*qty)}</p>}
                </div>
                {outOfStock?<span style={{fontSize:10,color:T.danger,fontWeight:700}}>在庫切れ</span>:(
                  <div style={{display:"flex",alignItems:"center",gap:7,marginLeft:10}}>
                    <button onClick={()=>setQty(prod.id,-1)} disabled={qty===0} className={qty>0?"hbtn":""} style={{width:26,height:26,borderRadius:"50%",border:`1.5px solid ${qty>0?T.primary:T.border}`,background:qty>0?T.primary:T.raised,color:qty>0?"#fff":T.textMeta,cursor:qty===0?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",transition:"all 0.15s"}}><Ic d={ic.minus} size={11} color={qty>0?"#fff":T.textMeta} sw={2}/></button>
                    <span style={{fontSize:14,fontWeight:700,color:qty>0?T.primaryDark:T.text,minWidth:18,textAlign:"center",fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{qty}</span>
                    <button onClick={()=>setQty(prod.id,1)} disabled={qty>=prod.maxQty} className={qty<prod.maxQty?"hbtn":""} style={{width:26,height:26,borderRadius:"50%",border:`1.5px solid ${qty<prod.maxQty?T.primary:T.border}`,background:qty>=prod.maxQty?T.raised:T.primary,color:qty>=prod.maxQty?T.textMeta:"#fff",cursor:qty>=prod.maxQty?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",transition:"all 0.15s"}}><Ic d={ic.plus} size={11} color={qty>=prod.maxQty?T.textMeta:"#fff"} sw={2}/></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{position:"sticky",bottom:0,background:T.card,paddingTop:5,borderTop:`1px solid ${T.border}`}}>
        <div style={{background:totalQty>0?T.primaryXLight:T.raised,borderRadius:8,padding:"9px 12px",marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${totalQty>0?T.primaryBorder:T.border}`,transition:"all 0.2s"}}>
          <div><p style={{fontSize:9,color:T.textMeta,margin:"0 0 1px"}}>{totalQty>0?`${totalQty}点選択中`:"商品を選んでください"}</p><p style={{fontSize:17,fontWeight:800,color:totalQty>0?T.primaryDark:T.textMeta,margin:0,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{totalQty>0?fmtP(total):"¥ —"}</p></div>
          {totalQty>0&&<div style={{background:T.primary,borderRadius:5,padding:"2px 9px",fontSize:9,fontWeight:700,color:"#fff"}}>{totalQty}点</div>}
        </div>
        <button onClick={()=>setStep("confirm")} disabled={totalQty===0} className={totalQty>0?"hbtn":""} style={{width:"100%",padding:"11px 0",borderRadius:9,border:"none",background:totalQty===0?T.raised:T.primary,color:totalQty===0?T.textMeta:"#fff",fontSize:12,fontWeight:700,cursor:totalQty===0?"not-allowed":"pointer",fontFamily:"inherit",minHeight:44,boxShadow:totalQty>0?"0 3px 14px rgba(168,120,128,0.28)":"none",letterSpacing:0.2}}>確認画面へ →</button>
      </div>
    </Sheet>
  );
}

// ── 未注文顧客の新規登録（低頻度） ──
function SheetFirstOrderEntry({onClose,onSubmit}){
  const initShip=addDays(new Date().toISOString().slice(0,10),1);
  const[step,setStep]=useState(1);
  const[cust,setCust]=useState({name:"",kana:"",phone:"",email:"",zip:"",address:""});
  const[order,setOrder]=useState({productId:PRODUCTS[0]?.id||"",qty:1,shipDate:initShip,timeSlot:"指定なし",note:""});
  const product=useMemo(()=>PRODUCTS.find(p=>p.id===order.productId)||PRODUCTS[0],[order.productId]);
  const amount=(product?.price||0)*Math.max(1,Number(order.qty)||1);
  const arrival=order.shipDate?calcArrivalFromShip(order.shipDate):"";
  const canStep1=Boolean(cust.name.trim()&&cust.phone.trim());
  const canSave=Boolean(canStep1&&order.shipDate&&product);
  const setCustField=(k,v)=>setCust(prev=>({...prev,[k]:v}));
  const setOrderField=(k,v)=>setOrder(prev=>({...prev,[k]:v}));
  const applyZip=()=>{
    const hit=ZIP_LOOKUP[cust.zip];
    if(hit){
      const merged=[hit.pref,hit.addr,hit.bldg].filter(Boolean).join("");
      setCust(prev=>({...prev,address:merged}));
    }
  };
  return(
    <Sheet title={`未注文の新規登録 ${step}/2`} iconKey="plus" onClose={onClose}>
      <div style={{background:T.raised,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 10px",marginBottom:10}}>
        <p style={{fontSize:9,color:T.textMeta,margin:0}}>低頻度業務: 顧客情報と初回注文をまとめて登録</p>
      </div>

      {step===1&&(<div style={{display:"flex",flexDirection:"column",gap:7}}>
        <input value={cust.name} onChange={e=>setCustField("name",e.target.value)} placeholder="氏名（必須）"
          style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
        <input value={cust.kana} onChange={e=>setCustField("kana",e.target.value)} placeholder="フリガナ"
          style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
        <input value={cust.phone} onChange={e=>setCustField("phone",e.target.value)} placeholder="電話番号（必須）"
          style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
        <input value={cust.email} onChange={e=>setCustField("email",e.target.value)} placeholder="メール"
          style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
        <div style={{display:"grid",gridTemplateColumns:"90px 1fr",gap:6}}>
          <input value={cust.zip} onChange={e=>setCustField("zip",e.target.value)} onBlur={applyZip} placeholder="郵便番号"
            style={{padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
          <input value={cust.address} onChange={e=>setCustField("address",e.target.value)} placeholder="住所"
            style={{padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
        </div>
      </div>)}

      {step===2&&(<div style={{display:"flex",flexDirection:"column",gap:8}}>
        <label style={{fontSize:10,color:T.textMeta}}>商品</label>
        <select value={order.productId} onChange={e=>setOrderField("productId",e.target.value)}
          style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}>
          {PRODUCTS.filter(p=>p.stock).map(p=><option key={p.id} value={p.id}>{p.name} {p.size}</option>)}
        </select>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <div>
            <label style={{fontSize:10,color:T.textMeta,display:"block",marginBottom:3}}>数量</label>
            <input type="number" min={1} value={order.qty} onChange={e=>setOrderField("qty",Math.max(1,Number(e.target.value)||1))}
              style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
          </div>
          <div>
            <label style={{fontSize:10,color:T.textMeta,display:"block",marginBottom:3}}>時間帯</label>
            <select value={order.timeSlot} onChange={e=>setOrderField("timeSlot",e.target.value)}
              style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}>
              {["指定なし","午前中","14-16時","16-18時","18-20時","19-21時"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{fontSize:10,color:T.textMeta,display:"block",marginBottom:3}}>発送日</label>
          <input type="date" value={order.shipDate} onChange={e=>setOrderField("shipDate",e.target.value)}
            style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
        </div>
        <input value={order.note} onChange={e=>setOrderField("note",e.target.value)} placeholder="注文メモ（任意）"
          style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>

        <div style={{background:T.primaryXLight,border:`1px solid ${T.primaryBorder}`,borderRadius:8,padding:"9px 10px"}}>
          <p style={{fontSize:9,color:T.textMeta,margin:0}}>初回注文サマリー</p>
          <p style={{fontSize:11,fontWeight:700,color:T.text,margin:"2px 0 0"}}>{product?.name} {product?.size} ×{Math.max(1,Number(order.qty)||1)}</p>
          <p style={{fontSize:10,color:T.textSub,margin:"2px 0 0"}}>発送 {fmtDS(order.shipDate)} / お届け {fmtDS(arrival)} / {order.timeSlot}</p>
          <p style={{fontSize:14,fontWeight:800,color:T.primaryDark,margin:"4px 0 0"}}>{fmtP(amount)}</p>
        </div>
      </div>)}

      <div style={{display:"flex",gap:7,marginTop:12}}>
        {step===2&&(
          <button onClick={()=>setStep(1)} className="hbtn"
            style={{flex:1,padding:"10px 0",borderRadius:9,border:`1px solid ${T.border}`,background:T.raised,color:T.textSub,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",minHeight:42}}>
            ← 戻る
          </button>
        )}
        {step===1?(
          <button onClick={()=>setStep(2)} disabled={!canStep1} className={canStep1?"hbtn":""}
            style={{flex:1,padding:"10px 0",borderRadius:9,border:"none",background:canStep1?T.primary:T.raised,color:canStep1?"#fff":T.textMeta,fontSize:11,fontWeight:700,cursor:canStep1?"pointer":"not-allowed",fontFamily:"inherit",minHeight:42}}>
            注文情報へ
          </button>
        ):(
          <button onClick={()=>onSubmit({
            customer:{...cust,address:cust.address||"（未登録）",email:cust.email||"（未登録）",kana:cust.kana||"（未登録）"},
            order:{productId:product?.id,productName:product?.name,size:product?.size,qty:Math.max(1,Number(order.qty)||1),amount,shipDate:order.shipDate,deliveryDate:arrival,timeSlot:order.timeSlot,note:order.note},
          })} disabled={!canSave} className={canSave?"hbtn":""}
            style={{flex:1.4,padding:"10px 0",borderRadius:9,border:"none",background:canSave?T.primary:T.raised,color:canSave?"#fff":T.textMeta,fontSize:11,fontWeight:700,cursor:canSave?"pointer":"not-allowed",fontFamily:"inherit",minHeight:42}}>
            登録する
          </button>
        )}
      </div>
    </Sheet>
  );
}

// ── 単品テンプレ作成（単品別送 / お詫び別送 / 差し替え） ──
function SheetSingleTemplate({onClose,onSubmit}){
  const today=new Date().toISOString().slice(0,10);
  const templates=[
    {key:"single",label:"単品別送",desc:"通常の単品を別送します",free:false},
    {key:"apology",label:"お詫び別送",desc:"お詫び品を無償で別送します",free:true},
    {key:"replace",label:"差し替え発送",desc:"不良・破損品の差し替えを発送します",free:true},
  ];
  const[template,setTemplate]=useState("single");
  const[vals,setVals]=useState({
    productId:PRODUCTS.find(p=>p.stock)?.id||PRODUCTS[0]?.id||"",
    qty:1,
    shipDate:addDays(today,1),
    timeSlot:"指定なし",
    memo:"",
  });
  const tpl=templates.find(t=>t.key===template)||templates[0];
  const product=PRODUCTS.find(p=>p.id===vals.productId)||PRODUCTS[0];
  const qty=Math.max(1,Number(vals.qty)||1);
  const rawAmount=(product?.price||0)*qty;
  const amount=tpl.free?0:rawAmount;
  const arrival=vals.shipDate?calcArrivalFromShip(vals.shipDate):"";
  const canSubmit=Boolean(product&&vals.shipDate);
  return(
    <Sheet title="単品テンプレ作成" iconKey="single" onClose={onClose}>
      <p style={{fontSize:9,fontWeight:700,color:T.textMeta,marginBottom:7,letterSpacing:0.6,textTransform:"uppercase"}}>テンプレート</p>
      <div role="radiogroup" style={{display:"flex",flexDirection:"column",gap:5,marginBottom:10}}>
        {templates.map(t=>(
          <button key={t.key} onClick={()=>setTemplate(t.key)} className="hbtn" role="radio" aria-checked={template===t.key}
            style={{padding:"8px 10px",borderRadius:8,border:`1.5px solid ${template===t.key?T.primary:T.border}`,background:template===t.key?T.primaryXLight:T.card,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
            <p style={{fontSize:11,fontWeight:700,color:T.text,margin:0}}>{t.label}</p>
            <p style={{fontSize:9,color:T.textMeta,margin:"2px 0 0"}}>{t.desc}</p>
          </button>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <div>
          <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>商品</label>
          <select value={vals.productId} onChange={e=>setVals(v=>({...v,productId:e.target.value}))}
            style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}>
            {PRODUCTS.filter(p=>p.stock).map(p=><option key={p.id} value={p.id}>{p.name} {p.size}</option>)}
          </select>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <div>
            <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>数量</label>
            <input type="number" min={1} value={qty} onChange={e=>setVals(v=>({...v,qty:Math.max(1,Number(e.target.value)||1)}))}
              style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
          </div>
          <div>
            <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>時間帯</label>
            <select value={vals.timeSlot} onChange={e=>setVals(v=>({...v,timeSlot:e.target.value}))}
              style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}>
              {["指定なし","午前中","14-16時","16-18時","18-20時","19-21時"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>発送日</label>
          <input type="date" value={vals.shipDate} onChange={e=>setVals(v=>({...v,shipDate:e.target.value}))}
            style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
        </div>
        <input value={vals.memo} onChange={e=>setVals(v=>({...v,memo:e.target.value}))} placeholder="対応メモ（任意）"
          style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
      </div>
      <div style={{marginTop:10,background:T.primaryXLight,border:`1px solid ${T.primaryBorder}`,borderRadius:8,padding:"8px 10px"}}>
        <p style={{fontSize:9,color:T.textMeta,margin:0}}>作成内容</p>
        <p style={{fontSize:11,fontWeight:700,color:T.text,margin:"2px 0 0"}}>{tpl.label} / {product?.name} {product?.size} ×{qty}</p>
        <p style={{fontSize:9,color:T.textSub,margin:"2px 0 0"}}>発送 {fmtDS(vals.shipDate)} / お届け {fmtDS(arrival)} / {vals.timeSlot}</p>
        <p style={{fontSize:14,fontWeight:800,color:T.primaryDark,margin:"4px 0 0"}}>{fmtP(amount)}</p>
      </div>
      <div style={{height:10}}/>
      <Btn label="単品注文を作成する" iconKey="check" variant="primary" disabled={!canSubmit}
        onClick={()=>onSubmit({
          templateKey:tpl.key,
          templateLabel:tpl.label,
          productId:product?.id,
          productName:product?.name,
          size:product?.size,
          qty,
          shipDate:vals.shipDate,
          deliveryDate:arrival,
          timeSlot:vals.timeSlot,
          memo:vals.memo,
          amount,
        })}/>
    </Sheet>
  );
}

// ── 単品注文編集 ──
function SheetSingleOrderEdit({order,onClose,onSave,onCancel}){
  const fallbackShipDate=order?.shipDate||(order?.date?String(order.date).replace(/\//g,"-"):new Date().toISOString().slice(0,10));
  const parsed=parseSingleItemText(order?.items);
  const[vals,setVals]=useState({
    productName:order?.productName||parsed.productName||"商品",
    size:order?.size||parsed.size||"",
    qty:Math.max(1,Number(order?.qty)||parsed.qty||1),
    shipDate:fallbackShipDate,
    timeSlot:order?.timeSlot||"指定なし",
    amount:Number.isFinite(Number(order?.amount))?Number(order.amount):parseYen(order?.amt),
    memo:order?.memo||"",
    status:order?.status||"発送待ち",
  });
  useEffect(()=>{
    const nextShip=order?.shipDate||(order?.date?String(order.date).replace(/\//g,"-"):new Date().toISOString().slice(0,10));
    const parsedNext=parseSingleItemText(order?.items);
    setVals({
      productName:order?.productName||parsedNext.productName||"商品",
      size:order?.size||parsedNext.size||"",
      qty:Math.max(1,Number(order?.qty)||parsedNext.qty||1),
      shipDate:nextShip,
      timeSlot:order?.timeSlot||"指定なし",
      amount:Number.isFinite(Number(order?.amount))?Number(order.amount):parseYen(order?.amt),
      memo:order?.memo||"",
      status:order?.status||"発送待ち",
    });
  },[order?.id]);
  const qty=Math.max(1,Number(vals.qty)||1);
  const amount=Math.max(0,Math.floor(Number(vals.amount)||0));
  const canSave=Boolean(vals.productName.trim()&&vals.shipDate);
  const arrival=vals.shipDate?calcArrivalFromShip(vals.shipDate):"";
  const statuses=["支払待ち","発送待ち","配送完了","キャンセル"];
  return(
    <Sheet title="単品注文を編集" iconKey="single" onClose={onClose}>
      <div style={{background:T.raised,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 10px",marginBottom:10}}>
        <p style={{fontSize:9,color:T.textMeta,margin:0}}>注文ID {order?.id||"—"}</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <div>
          <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>商品名</label>
          <input value={vals.productName} onChange={e=>setVals(v=>({...v,productName:e.target.value}))}
            style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <div>
            <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>サイズ</label>
            <input value={vals.size} onChange={e=>setVals(v=>({...v,size:e.target.value}))}
              style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
          </div>
          <div>
            <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>数量</label>
            <input type="number" min={1} value={qty} onChange={e=>setVals(v=>({...v,qty:Math.max(1,Number(e.target.value)||1)}))}
              style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <div>
            <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>発送日</label>
            <input type="date" value={vals.shipDate} onChange={e=>setVals(v=>({...v,shipDate:e.target.value}))}
              style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
          </div>
          <div>
            <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>時間帯</label>
            <select value={vals.timeSlot} onChange={e=>setVals(v=>({...v,timeSlot:e.target.value}))}
              style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}>
              {["指定なし","午前中","14-16時","16-18時","18-20時","19-21時"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <div>
            <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>金額</label>
            <input type="number" min={0} value={amount} onChange={e=>setVals(v=>({...v,amount:Math.max(0,Math.floor(Number(e.target.value)||0))}))}
              style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
          </div>
          <div>
            <label style={{fontSize:9,fontWeight:700,color:T.textMeta,display:"block",marginBottom:3}}>ステータス</label>
            <select value={vals.status} onChange={e=>setVals(v=>({...v,status:e.target.value}))}
              style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}>
              {statuses.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <input value={vals.memo} onChange={e=>setVals(v=>({...v,memo:e.target.value}))} placeholder="対応メモ（任意）"
          style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.surface}}/>
      </div>

      <div style={{marginTop:10,background:T.primaryXLight,border:`1px solid ${T.primaryBorder}`,borderRadius:8,padding:"8px 10px"}}>
        <p style={{fontSize:9,color:T.textMeta,margin:0}}>更新後プレビュー</p>
        <p style={{fontSize:11,fontWeight:700,color:T.text,margin:"2px 0 0"}}>{vals.productName||"商品"} {vals.size} ×{qty}</p>
        <p style={{fontSize:9,color:T.textSub,margin:"2px 0 0"}}>発送 {fmtDS(vals.shipDate)} / お届け {fmtDS(arrival)} / {vals.timeSlot}</p>
        <p style={{fontSize:14,fontWeight:800,color:T.primaryDark,margin:"4px 0 0"}}>{fmtP(amount)}</p>
      </div>

      <div style={{display:"flex",gap:7,marginTop:12}}>
        <button onClick={onClose} className="hbtn"
          style={{flex:1,padding:"10px 0",borderRadius:9,border:`1px solid ${T.border}`,background:T.raised,color:T.textSub,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",minHeight:42}}>
          戻る
        </button>
        <button onClick={()=>onSave({...vals,qty,amount})} disabled={!canSave} className={canSave?"hbtn":""}
          style={{flex:1.2,padding:"10px 0",borderRadius:9,border:"none",background:canSave?T.primary:T.raised,color:canSave?"#fff":T.textMeta,fontSize:11,fontWeight:700,cursor:canSave?"pointer":"not-allowed",fontFamily:"inherit",minHeight:42,boxShadow:canSave?"0 2px 12px rgba(168,120,128,0.25)":"none"}}>
          保存する
        </button>
      </div>

      <button onClick={onCancel} className="hbtn"
        style={{width:"100%",marginTop:8,padding:"10px 0",borderRadius:9,border:`1px solid ${T.dangerBorder}`,background:T.dangerBg,color:T.danger,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",minHeight:40}}>
        この単品注文をキャンセル
      </button>
    </Sheet>
  );
}

// ── トースト ──
function Toast({msg,type,onDismiss}){
  useEffect(()=>{const t=setTimeout(onDismiss,3500);return()=>clearTimeout(t);},[onDismiss]);
  const c=type==="success"?T.success:type==="warning"?T.warning:T.danger;
  const border=type==="success"?T.successBorder:type==="warning"?T.warningBorder:T.dangerBorder;
  return(
    <div role="status" style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:T.card,border:`1px solid ${border}`,borderRadius:8,padding:"9px 14px",fontSize:11,fontWeight:700,color:c,letterSpacing:0.2,boxShadow:"0 8px 28px rgba(58,44,40,0.15)",zIndex:300,animation:"toastIn 0.22s cubic-bezier(0.32,0.72,0,1)",display:"flex",alignItems:"center",gap:7,whiteSpace:"nowrap"}}>
      <span style={{width:5,height:5,borderRadius:"50%",background:c,flexShrink:0}}/>
      {msg}
      <button onClick={onDismiss} className="hbtn" style={{background:"none",border:"none",cursor:"pointer",padding:2,color:c,display:"flex",alignItems:"center",opacity:0.55}}><Ic d={ic.x} size={10} color={c}/></button>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  メインアプリ
// ══════════════════════════════════════════════════════
export default function App(){
  const[q,setQ]=useState("");
  const[searching,setSearching]=useState(false);
  const[searchErr,setSearchErr]=useState(null);
  const[customer,setCustomer]=useState(MOCK);
  const[selSubId,setSelSubId]=useState(MOCK.subscriptions.find(s=>s.status==="active")?.id||null);
  const[showPaused,setShowPaused]=useState(false);
  const[tab,setTab]=useState("sub");
  const[sheet,setSheet]=useState(null);
  const[editingLineIndex,setEditingLineIndex]=useState(null);
  const[editingSingleOrderId,setEditingSingleOrderId]=useState(null);
  const[toasts,setToasts]=useState([]);
  const[stepOpen,setStepOpen]=useState({s1:true,s2:true,s3:true});
  const dt=detectType(q);
  const pushToast=useCallback((msg,type="success")=>setToasts(p=>[...p,{id:Date.now(),msg,type}]),[]);
  const rmToast=useCallback((id)=>setToasts(p=>p.filter(t=>t.id!==id)),[]);
  const notify=useCallback((msg,type="success")=>pushToast(msg,type),[pushToast]);
  const toggleStep=useCallback((k)=>setStepOpen(prev=>({...prev,[k]:!prev[k]})),[]);
  const doSearch=()=>{
    if(!q.trim())return;setSearching(true);setSearchErr(null);
    setTimeout(()=>{
      if(q.includes("エラー")){setSearching(false);setSearchErr("network");return;}
      const next=q.includes("単品")||q.includes("鈴木")?MOCK_SINGLE:MOCK;
      setSearching(false);setCustomer(next);
      setSelSubId(next.subscriptions.find(s=>s.status==="active")?.id||null);
      setTab("sub");setQ("");
    },600);
  };
  const done=useCallback((msg,type="success")=>{setSheet(null);pushToast(msg,type);},[pushToast]);
  const updateSelectedChildOrder=useCallback((updater)=>{
    if(!selSubId)return;
    setCustomer(prev=>{
      if(!prev)return prev;
      const nextSubs=(prev.subscriptions||[]).map(s=>{
        if(s.id!==selSubId)return s;
        const seedItems=(s.child?.lineItems&&s.child.lineItems.length>0)
          ? s.child.lineItems.map(li=>({...li}))
          : (s.items||[]).map(i=>({type:"subscription",name:i.name,size:i.size,qty:Number(i.qty||1),price:Number(i.price||0)}));
        const baseChild=s.child
          ? {...s.child,lineItems:seedItems}
          : {
              id:s.latestOrder?.id||`ORD-${String(Date.now()).slice(-4)}`,
              editable:true,
              lockReason:"",
              shipDate:calcShip(s.nextDate),
              deliveryDate:s.nextDate,
              status:s.latestOrder?.status||"発送待ち",
              deadline:DEADLINE,
              lineItems:seedItems,
              pointsUsed:0,
              couponDiscount:0,
              shippingFee:0,
              totalAmount:0,
            };
        const maybeNext=updater(baseChild,s);
        if(!maybeNext)return s;
        const lineItems=(maybeNext.lineItems||[])
          .map(li=>({
            ...li,
            qty:Math.max(0,Math.floor(Number(li.qty)||0)),
            price:Math.max(0,Math.floor(Number(li.price)||0)),
          }))
          .filter(li=>li.qty>0);
        const pointsUsed=Math.max(0,Math.floor(Number(maybeNext.pointsUsed||0)));
        const couponDiscount=Math.max(0,Math.floor(Number(maybeNext.couponDiscount||0)));
        const shippingFee=Math.max(0,Math.floor(Number(maybeNext.shippingFee||0)));
        const itemsTotal=lineItems.reduce((sum,li)=>sum+Number(li.price||0)*Number(li.qty||0),0);
        const totalAmount=Math.max(0,itemsTotal-pointsUsed-couponDiscount+shippingFee);
        return{
          ...s,
          child:{
            ...baseChild,
            ...maybeNext,
            lineItems,
            pointsUsed,
            couponDiscount,
            shippingFee,
            totalAmount,
          },
        };
      });
      return{...prev,subscriptions:nextSubs};
    });
  },[selSubId]);
  const openLineItemEdit=useCallback((idx)=>{
    setEditingLineIndex(idx);
    setSheet("lineItem");
  },[]);
  const closeLineItemEdit=useCallback(()=>{
    setEditingLineIndex(null);
    setSheet(null);
  },[]);
  const saveLineItemEdit=useCallback((payload)=>{
    if(editingLineIndex==null)return;
    updateSelectedChildOrder(targetChild=>{
      const nextItems=[...(targetChild.lineItems||[])];
      if(editingLineIndex<0||editingLineIndex>=nextItems.length)return targetChild;
      if(payload?.remove){
        nextItems.splice(editingLineIndex,1);
      }else{
        nextItems[editingLineIndex]={
          ...nextItems[editingLineIndex],
          qty:payload.qty,
          price:payload.price,
        };
      }
      return{...targetChild,lineItems:nextItems};
    });
    setEditingLineIndex(null);
    done(payload?.remove?"明細を削除しました":"明細を更新しました");
  },[editingLineIndex,updateSelectedChildOrder,done]);
  const savePointsEdit=useCallback((nextPoints)=>{
    updateSelectedChildOrder(targetChild=>({...targetChild,pointsUsed:nextPoints}));
    done("ポイント利用を更新しました");
  },[updateSelectedChildOrder,done]);
  const openSingleOrderEdit=useCallback((orderId)=>{
    setEditingSingleOrderId(orderId);
    setSheet("singleOrder");
  },[]);
  const closeSingleOrderEdit=useCallback(()=>{
    setEditingSingleOrderId(null);
    setSheet(null);
  },[]);
  const saveSingleOrderEdit=useCallback((payload)=>{
    if(!editingSingleOrderId)return;
    setCustomer(prev=>prev?{
      ...prev,
      orders:(prev.orders||[]).map(o=>{
        if(!o.isSingle||o.id!==editingSingleOrderId)return o;
        const nextItems=`${payload.productName||"商品"} ${payload.size||""}×${Math.max(1,Number(payload.qty)||1)}`.trim();
        return{
          ...o,
          productName:payload.productName||o.productName||"商品",
          size:payload.size||"",
          qty:Math.max(1,Number(payload.qty)||1),
          shipDate:payload.shipDate,
          deliveryDate:payload.shipDate?calcArrivalFromShip(payload.shipDate):o.deliveryDate,
          timeSlot:payload.timeSlot||"指定なし",
          memo:payload.memo||"",
          amount:Math.max(0,Math.floor(Number(payload.amount)||0)),
          status:payload.status||o.status,
          date:(payload.shipDate||o.shipDate||String(o.date||"").replace(/\//g,"-")).replace(/-/g,"/"),
          amt:fmtP(Math.max(0,Math.floor(Number(payload.amount)||0))),
          items:o.templateLabel?`${nextItems}（${o.templateLabel}）`:nextItems,
        };
      }),
    }:prev);
    setEditingSingleOrderId(null);
    done("単品注文を更新しました");
  },[editingSingleOrderId,done]);
  const cancelSingleOrderEdit=useCallback(()=>{
    if(!editingSingleOrderId)return;
    if(!window.confirm("この単品注文をキャンセルしますか？"))return;
    setCustomer(prev=>prev?{
      ...prev,
      orders:(prev.orders||[]).map(o=>{
        if(!o.isSingle||o.id!==editingSingleOrderId)return o;
        return{...o,status:"キャンセル"};
      }),
    }:prev);
    setEditingSingleOrderId(null);
    done("単品注文をキャンセルしました","warning");
  },[editingSingleOrderId,done]);
  const saveRegistrationInfo=useCallback((nextInfo)=>{
    setCustomer(prev=>prev?{
      ...prev,
      phone:nextInfo.phone.trim()||prev.phone,
      email:nextInfo.email.trim()||"（未登録）",
      address:nextInfo.address.trim()||"（未登録）",
      memberType:nextInfo.memberType,
      customerMemo:nextInfo.customerMemo,
      dmOptIn:Boolean(nextInfo.dmOptIn),
      newsletterOptIn:Boolean(nextInfo.newsletterOptIn),
      outboundBlocked:Boolean(nextInfo.outboundBlocked),
    }:prev);
    done("登録情報を更新しました");
  },[done]);
  const sub=customer?.subscriptions.find(s=>s.id===selSubId);
  const child=sub?.child||null;
  const childDisplayItems=(child?.lineItems&&child.lineItems.length>0)
    ? child.lineItems
    : (sub?.items||[]).map(i=>({type:"subscription",name:i.name,size:i.size,qty:i.qty,price:i.price}));
  const childItemsTotal=childDisplayItems.reduce((sum,it)=>sum+Number(it.price||0)*Number(it.qty||0),0);
  const pointsUsed=Number(child?.pointsUsed||0);
  const couponDiscount=Number(child?.couponDiscount||0);
  const shippingFee=Number(child?.shippingFee||0);
  const childTotal=Number.isFinite(Number(child?.totalAmount))
    ? Number(child.totalAmount)
    : Math.max(0,childItemsTotal-pointsUsed-couponDiscount+shippingFee);
  const childProductSummary=childDisplayItems.map(i=>`${i.name} ${i.size}×${i.qty}`).join("、")||"—";
  const childStatus=child?.status||sub?.latestOrder?.status||null;
  const childStatusInfo=childStatus?ORDER_STATUS[childStatus]:null;
  const editingLineItem=editingLineIndex!=null?(childDisplayItems[editingLineIndex]||null):null;
  const editingSingleOrder=(customer?.orders||[]).find(o=>o.isSingle&&o.id===editingSingleOrderId)||null;
  const isSubPaused=sub?.status==="paused";
  const subStatusLabel=!sub?"未選択":isSubPaused?"停止中":"継続中";
  const subStatusColor=!sub?T.textMeta:isSubPaused?T.warning:T.success;
  const subStatusBg=!sub?T.raised:isSubPaused?T.warningBg:T.successBg;
  const subStatusBorder=!sub?T.border:isSubPaused?T.warningBorder:T.successBorder;
  const childNumId=((child?.id?String(child.id).replace(/\D/g,""):"")||"—");
  const childOrderNo=childNumId==="—"?"—":`EP${childNumId}`;
  const activeSubs=customer?.subscriptions.filter(s=>s.status==="active")||[];
  const pausedSubs=customer?.subscriptions.filter(s=>s.status==="paused")||[];
  const hasSubs=customer?.subscriptions.length>0;
  useEffect(()=>{
    if(tab==="info")setTab(hasSubs?"sub":"orders");
  },[tab,hasSubs]);
  const runSkipChild=()=>{
    if(!sub)return;
    if(window.confirm("次回注文をスキップしますか？")){
      const applyResult=sub?.child?.editable
        ? "今回の注文に反映しました"
        : "この注文は確定済みのため、次回注文から反映します";
      done(`スキップを登録しました。${applyResult}`,"warning");
    }
  };
  const runWithdrawCustomer=()=>{
    if(window.confirm("退会処理を実行しますか？")){
      done("退会を登録しました","warning");
    }
  };
  const runDeletePersonalInfo=()=>{
    if(window.confirm("個人情報削除を実行しますか？")){
      setCustomer(prev=>prev?{
        ...prev,
        name:"（削除済み）",
        kana:"",
        phone:"（削除済み）",
        email:"（削除済み）",
        address:"（削除済み）",
        customerMemo:"",
      }:prev);
      done("個人情報削除を登録しました","warning");
    }
  };
  const runToggleDmReject=()=>{
    let nextBlocked=false;
    setCustomer(prev=>{
      if(!prev)return prev;
      nextBlocked=!prev.outboundBlocked;
      return{
        ...prev,
        outboundBlocked:nextBlocked,
        dmOptIn:nextBlocked?false:prev.dmOptIn,
        newsletterOptIn:nextBlocked?false:prev.newsletterOptIn,
      };
    });
    done(nextBlocked?"DM拒否を登録しました":"DM拒否を解除しました","warning");
  };
  const handleCreateSingleTemplate=useCallback((payload)=>{
    const ts=Date.now();
    const newOrder={
      id:`ORD-SINGLE-${String(ts).slice(-4)}`,
      date:(payload.shipDate||new Date().toISOString().slice(0,10)).replace(/-/g,"/"),
      status:"発送待ち",
      amt:fmtP(payload.amount||0),
      items:`${payload.productName||"商品"} ${payload.size||""}×${payload.qty||1}（${payload.templateLabel||"単品"}）`.trim(),
      isSingle:true,
      templateKey:payload.templateKey||"single",
      templateLabel:payload.templateLabel||"単品",
      productId:payload.productId||"",
      productName:payload.productName||"商品",
      size:payload.size||"",
      qty:Math.max(1,Number(payload.qty)||1),
      shipDate:payload.shipDate||new Date().toISOString().slice(0,10),
      deliveryDate:payload.deliveryDate||null,
      timeSlot:payload.timeSlot||"指定なし",
      memo:payload.memo||"",
      amount:Math.max(0,Math.floor(Number(payload.amount)||0)),
    };
    setCustomer(prev=>prev?{...prev,orders:[newOrder,...(prev.orders||[])]}:prev);
    setTab("orders");
    done(`${payload.templateLabel||"単品"}を作成しました`);
  },[done]);
  const handleFirstOrderCreate=useCallback((payload)=>{
    const ts=Date.now();
    const newCustomer={
      name:payload.customer.name,
      kana:payload.customer.kana||"（未登録）",
      id:String(ts).slice(-7),
      phone:payload.customer.phone,
      email:payload.customer.email||"（未登録）",
      address:payload.customer.address||"（未登録）",
      memberType:"通常会員",
      dmOptIn:false,
      newsletterOptIn:false,
      outboundBlocked:false,
      customerMemo:"",
      subscriptions:[],
      orders:[{
        id:`ORD-NEW-${String(ts).slice(-4)}`,
        date:(payload.order.shipDate||new Date().toISOString().slice(0,10)).replace(/-/g,"/"),
        status:"発送待ち",
        amt:fmtP(payload.order.amount||0),
        items:`${payload.order.productName||"商品"} ${payload.order.size||""}×${payload.order.qty||1}`.trim(),
        isSingle:true,
        templateKey:"single",
        templateLabel:"初回注文",
        productId:payload.order.productId||"",
        productName:payload.order.productName||"商品",
        size:payload.order.size||"",
        qty:Math.max(1,Number(payload.order.qty)||1),
        shipDate:payload.order.shipDate||new Date().toISOString().slice(0,10),
        deliveryDate:payload.order.deliveryDate||null,
        timeSlot:payload.order.timeSlot||"指定なし",
        memo:payload.order.note||"",
        amount:Math.max(0,Math.floor(Number(payload.order.amount)||0)),
      }],
    };
    setCustomer(newCustomer);
    setSelSubId(null);
    setTab("orders");
    done(`顧客情報と初回注文を登録しました（${payload.customer.name}様）`);
  },[done]);

  const openRegInfoSheet=(msg)=>{
    setSheet("regInfo");
    if(msg)pushToast(msg,"warning");
  };
  const apiDone=(label,type="success")=>done(`${label}を登録しました`,type);
  const noApiDone=(label)=>done(`${label}を記録しました（APIなし・手動対応）`,"warning");
  const actionTone={
    ghost:{bg:T.surface,border:T.border,color:T.textSub},
    primary:{bg:T.primaryXLight,border:T.primaryBorder,color:T.primaryDark},
    warning:{bg:T.warningBg,border:T.warningBorder,color:T.warning},
    danger:{bg:T.dangerBg,border:T.dangerBorder,color:T.danger},
    success:{bg:T.successBg,border:T.successBorder,color:T.success},
  };
  const statusTone={
    api:{label:"API",color:T.success,bg:T.successBg,border:T.successBorder},
    no_api:{label:"APIなし",color:T.warning,bg:T.warningBg,border:T.warningBorder},
    check:{label:"要確認",color:T.info,bg:T.infoBg,border:T.infoBorder},
  };
  const operationGroups=[
    {
      title:"キャンセル系",
      iconKey:"warning2",
      defaultOpen:true,
      note:"返品・配送戻り・停止/解約・与信NGキャンセル",
      items:[
        {label:"今回スキップ",iconKey:"skipFwd",variant:"warning",status:"api",onClick:runSkipChild},
        sub?.status==="active"
          ? {label:"定期停止",iconKey:"pause",variant:"warning",status:"api",onClick:()=>setSheet("pause")}
          : {label:"定期再開",iconKey:"play",variant:"success",status:"api",onClick:()=>setSheet("resume")},
        {label:"解約（以降すべて）",iconKey:"trash",variant:"danger",status:"api",onClick:()=>setSheet("cancel")},
        {label:"返品",iconKey:"history",variant:"ghost",status:"api",onClick:()=>apiDone("返品","warning")},
        {label:"配送戻り（長期不在/住所不明/受取拒否）",iconKey:"truck",variant:"ghost",status:"api",onClick:()=>apiDone("配送戻り","warning")},
        {label:"与信NGキャンセル（要対応解除）",iconKey:"alertTri",variant:"warning",status:"api",onClick:()=>apiDone("与信NGキャンセル","warning")},
      ],
    },
    {
      title:"顧客情報系",
      iconKey:"user",
      defaultOpen:false,
      note:"仮PW・会員タイプ・顧客メモ・コメント",
      items:[
        {label:"コメント追加",iconKey:"note",variant:"primary",status:"api",onClick:()=>setSheet("storeNote")},
        {label:"仮PW発行",iconKey:"lock",variant:"primary",status:"api",onClick:()=>openRegInfoSheet("登録情報画面で仮PW発行できます")},
        {label:"会員タイプ",iconKey:"user",variant:"primary",status:"check",onClick:()=>openRegInfoSheet("会員タイプAPIは要確認です。暫定で手動更新フローを開きました")},
        {label:"顧客メモ",iconKey:"note",variant:"primary",status:"api",onClick:()=>setSheet("regInfo")},
      ],
    },
    {
      title:"変更系",
      iconKey:"sync",
      defaultOpen:false,
      note:"支払い方法・配送会社・割引調整（コース変更は上段の「コース / サイクル」から）",
      items:[
        {label:"単品別送テンプレ（差し替え）",iconKey:"single",variant:"primary",status:"api",onClick:()=>setSheet("singleTemplate")},
        {label:"支払い方法変更",iconKey:"credit",variant:"ghost",status:"api",onClick:()=>apiDone("支払い方法変更")},
        {label:"配送会社",iconKey:"shipBox",variant:"ghost",status:"api",onClick:()=>apiDone("配送会社更新")},
        {label:"割引（金額調整）",iconKey:"receipt",variant:"ghost",status:"api",onClick:()=>apiDone("割引（金額調整）")},
      ],
    },
    {
      title:"そのほか",
      iconKey:"layers",
      defaultOpen:false,
      note:"媒体コード・支店",
      items:[
        {label:"媒体コード",iconKey:"tag",variant:"ghost",status:"api",onClick:()=>apiDone("媒体コード更新")},
        {label:"支店",iconKey:"home",variant:"ghost",status:"api",onClick:()=>apiDone("支店更新")},
      ],
    },
    {
      title:"APIなし",
      iconKey:"alertCirc",
      defaultOpen:false,
      note:"手動運用（記録のみ）",
      items:[
        {label:"特典変更",iconKey:"sparkle",variant:"warning",status:"no_api",onClick:()=>noApiDone("特典変更")},
        {label:"ポイント利用",iconKey:"receipt",variant:"warning",status:"no_api",onClick:()=>noApiDone("ポイント利用")},
        {label:"ポイント還元率",iconKey:"repeat",variant:"warning",status:"no_api",onClick:()=>noApiDone("ポイント還元率")},
        {label:"たまご生成",iconKey:"box",variant:"warning",status:"no_api",onClick:()=>noApiDone("たまご生成")},
        {label:"メールフラグの更新",iconKey:"mail",variant:"warning",status:"no_api",onClick:()=>noApiDone("メールフラグ更新")},
        {label:"メール送信",iconKey:"send",variant:"warning",status:"no_api",onClick:()=>noApiDone("メール送信")},
      ],
    },
  ];
  // 単品注文
  const singleOrders=customer?.orders.filter(o=>o.isSingle)||[];



  return(<>
    <style>{CSS}</style>
    <div data-build={BUILD_VER} style={{fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif",background:T.bg,width:320,minHeight:"100vh",color:T.text,boxShadow:"0 0 0 1px rgba(168,120,128,0.08), 0 32px 80px rgba(58,44,40,0.2)"}}>

      {/* ヘッダー */}
      <header style={{background:`linear-gradient(160deg,#FFF8F5 0%,${T.card} 100%)`,padding:"8px 12px",borderBottom:`1px solid ${T.border}`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${T.primary}60,transparent)`}}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div style={{minWidth:0}}>
            <p style={{fontSize:12,fontWeight:800,color:T.text,letterSpacing:0.2}}>カスタマサポートアプリ</p>
          </div>
          <div style={{width:32,height:32,borderRadius:9,background:T.primaryLight,border:`1px solid ${T.primaryBorder}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Ic d={ic.support} size={15} color={T.primary} sw={1.7}/>
          </div>
        </div>
      </header>

      {/* 検索 */}
      <div role="search" style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"7px 10px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:stepOpen.s1?5:0}}>
          <div style={{display:"flex",alignItems:"center",gap:5,minWidth:0}}>
            <span style={{fontSize:8,fontWeight:800,color:"#fff",background:T.primary,borderRadius:99,padding:"0 6px",lineHeight:"15px",letterSpacing:0.3,flexShrink:0}}>STEP 1</span>
            <Ic d={ic.search} size={11} color={T.primary} sw={1.8}/>
            <p style={{fontSize:10,fontWeight:700,color:T.textSub,margin:0}}>検索</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            {dt&&<Badge color={typeMap[dt].color} bg={typeMap[dt].bg} border={typeMap[dt].color+"33"} small>{typeMap[dt].label}</Badge>}
            <button onClick={()=>toggleStep("s1")} className="hbtn" aria-expanded={stepOpen.s1}
              style={{background:"none",border:"none",padding:2,cursor:"pointer",display:"flex",alignItems:"center",opacity:0.65}}>
              <Ic d={stepOpen.s1?ic.chevU:ic.chevD} size={11} color={T.textMeta}/>
            </button>
          </div>
        </div>
        {stepOpen.s1&&(
          <div>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:4}}>
              <button onClick={()=>setSheet("onboard")} className="hbtn"
                style={{background:"none",border:"none",padding:0,cursor:"pointer",fontFamily:"inherit",fontSize:9,fontWeight:500,color:T.textMeta,textDecoration:"underline",textUnderlineOffset:2,lineHeight:1.2}}>
                新規登録
              </button>
            </div>
            <div style={{display:"flex",alignItems:"stretch",gap:6}}>
              <div style={{position:"relative",flex:1,minWidth:0}}>
                <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><Ic d={ic.search} size={13} color={T.textMeta}/></div>
                <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()}
                  placeholder="例）090-1234-5678 / hanako@example.com / 1004281 / 山田"
                  style={{width:"100%",height:36,padding:"0 9px 0 32px",borderRadius:8,border:`1.5px solid ${dt?typeMap[dt].color+"44":T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.raised,transition:"all 0.16s"}}/>
              </div>
              <button onClick={doSearch} disabled={!q.trim()||searching} className={!q.trim()||searching?"":"hbtn"}
                style={{padding:"0 12px",borderRadius:7,border:"none",background:!q.trim()||searching?T.raised:T.primary,color:!q.trim()||searching?T.textMeta:"#fff",fontSize:11,fontWeight:700,cursor:!q.trim()||searching?"not-allowed":"pointer",fontFamily:"inherit",height:36,minWidth:86,display:"flex",alignItems:"center",justifyContent:"center",gap:5,boxShadow:!q.trim()||searching?"none":"0 1px 8px rgba(168,120,128,0.28)"}}>
                {searching&&<Spinner size={11} color={T.textMeta}/>}{searching?"検索中":"検索"}
              </button>
            </div>
          </div>
        )}
      </div>

      {searchErr&&<div style={{padding:"10px"}}><ErrorBlock type={searchErr} onRetry={()=>{setSearchErr(null);doSearch();}}/></div>}

      {customer&&!searchErr&&(<>
        {/* 顧客ヘッダー */}
        <div style={{background:T.card,padding:"11px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
              <span style={{fontSize:8,fontWeight:800,color:"#fff",background:T.primary,borderRadius:99,padding:"0 6px",lineHeight:"15px",letterSpacing:0.3,flexShrink:0}}>STEP 2</span>
              <p style={{fontSize:10,fontWeight:700,color:T.textSub,margin:0}}>登録情報</p>
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:5,flexWrap:"wrap"}}>
              <span style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{customer.name}</span>
              <span style={{fontSize:11,color:T.textMeta}}>様</span>
              <span style={{fontSize:10,color:T.textMeta}}>{customer.kana}</span>
            </div>
            <p style={{fontSize:9,color:T.textMeta,margin:"1px 0 0"}}>ID {customer.id}　{customer.phone}</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            <Badge color={T.success} bg={T.successBg} border={T.successBorder} small dot>確認済み</Badge>
            <button onClick={()=>setSheet("regInfo")} className="hbtn"
              style={{background:"none",border:"none",padding:2,cursor:"pointer",display:"flex",alignItems:"center",opacity:0.6}}>
              <Ic d={ic.pen} size={11} color={T.textMeta}/>
            </button>
            <button onClick={()=>toggleStep("s2")} className="hbtn" aria-expanded={stepOpen.s2}
              style={{background:"none",border:"none",padding:2,cursor:"pointer",display:"flex",alignItems:"center",opacity:0.65}}>
              <Ic d={stepOpen.s2?ic.chevU:ic.chevD} size={11} color={T.textMeta}/>
            </button>
          </div>
        </div>
        {stepOpen.s2&&(
          <div style={{background:T.surface,padding:"6px 14px",borderBottom:`1px solid ${T.border}`}}>
            <p style={{fontSize:9,color:T.textMeta,margin:"0 0 4px"}}>連絡先・登録住所・会員設定をここで確認</p>
            <div style={{display:"flex",alignItems:"center",gap:7,minHeight:20}}>
              <span style={{fontSize:9,color:T.textMeta,width:38,flexShrink:0}}>電話</span>
              <span style={{fontSize:10,color:T.text,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{customer.phone}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:7,minHeight:20}}>
              <span style={{fontSize:9,color:T.textMeta,width:38,flexShrink:0}}>メール</span>
              <span style={{fontSize:10,color:T.text,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{customer.email}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:7,minHeight:20}}>
              <span style={{fontSize:9,color:T.textMeta,width:38,flexShrink:0}}>登録住所</span>
              <span style={{fontSize:10,color:T.text,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{customer.address}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3}}>
              <Badge color={T.primary} bg={T.primaryLight} border={T.primaryBorder} small>{customer.memberType||"通常会員"}</Badge>
              <Badge color={customer.outboundBlocked?T.warning:T.success} bg={customer.outboundBlocked?T.warningBg:T.successBg} border={customer.outboundBlocked?T.warningBorder:T.successBorder} small>
                {customer.outboundBlocked?"アウトバウンド拒否":"アウトバウンド許可"}
              </Badge>
            </div>
          </div>
        )}

        {/* ★ 定期セレクター（停止中をトグルで隠す） */}
        {hasSubs&&customer.subscriptions.length>1&&(
          <div style={{background:T.surface,padding:"8px 12px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:2}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:8,fontWeight:800,color:"#fff",background:T.primary,borderRadius:99,padding:"0 6px",lineHeight:"15px",letterSpacing:0.3,flexShrink:0}}>STEP 3</span>
                <p style={{fontSize:10,fontWeight:700,color:T.textSub,margin:0}}>操作対象</p>
              </div>
              <button onClick={()=>toggleStep("s3")} className="hbtn" aria-expanded={stepOpen.s3}
                style={{background:"none",border:"none",padding:2,cursor:"pointer",display:"flex",alignItems:"center",opacity:0.65}}>
                <Ic d={stepOpen.s3?ic.chevU:ic.chevD} size={11} color={T.textMeta}/>
              </button>
            </div>
            <p style={{fontSize:9,color:T.textMeta,margin:"0 0 6px"}}>対象: {sub?.label||"—"}</p>
            {stepOpen.s3&&(
              <>
                {/* アクティブな定期 */}
                <div role="radiogroup" style={{display:"flex",flexDirection:"column",gap:5}}>
                  {activeSubs.map(s=>{
                    const isSel=selSubId===s.id;
                    return(
                      <button key={s.id} onClick={()=>setSelSubId(s.id)} className="hbtn" role="radio" aria-checked={isSel}
                        style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",borderRadius:9,border:`1.5px solid ${isSel?T.primary:T.border}`,background:isSel?T.primaryXLight:T.card,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all 0.15s",boxShadow:isSel?"0 2px 8px rgba(168,120,128,0.1)":"none"}}>
                        <div style={{width:14,height:14,borderRadius:"50%",flexShrink:0,border:`1.5px solid ${isSel?T.primary:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",background:isSel?T.primary:"transparent",transition:"all 0.15s"}}>
                          {isSel&&<div style={{width:5,height:5,borderRadius:"50%",background:"#fff"}}/>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:11,fontWeight:isSel?700:500,color:isSel?T.text:T.textSub,margin:0}}>{s.label}</p>
                          <p style={{fontSize:9,color:T.textMeta,margin:"1px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {qty2desc(s.items)} / {fmtP(s.price)}
                            {s.datePattern&&<span style={{color:T.primary,marginLeft:5}}>📌 {patternLabel(s.datePattern)}</span>}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* ★ 停止中トグル */}
                {pausedSubs.length>0&&(
                  <div style={{marginTop:7}}>
                    <button onClick={()=>setShowPaused(!showPaused)} className="hbtn"
                      style={{display:"flex",alignItems:"center",gap:6,padding:"5px 6px",borderRadius:7,border:`1px solid ${T.border}`,background:"transparent",cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:700,color:T.textMeta,width:"100%"}}>
                      <div style={{width:16,height:16,borderRadius:4,background:T.warningBg,border:`1px solid ${T.warningBorder}`,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic d={ic.pause} size={9} color={T.warning} sw={1.5}/></div>
                      <span>停止中の定期</span>
                      <span style={{fontSize:9,fontWeight:700,color:"#fff",background:T.warning,padding:"0 6px",borderRadius:99,lineHeight:"16px"}}>{pausedSubs.length}</span>
                      <Ic d={showPaused?ic.chevU:ic.chevD} size={10} color={T.textMeta} style={{marginLeft:"auto"}}/>
                    </button>
                    {showPaused&&(
                      <div style={{marginTop:5,display:"flex",flexDirection:"column",gap:4}}>
                        {pausedSubs.map(s=>(
                          <button key={s.id} onClick={()=>setSelSubId(s.id)} className="hbtn"
                            style={{display:"flex",alignItems:"center",gap:9,padding:"8px 11px",borderRadius:9,border:`1.5px solid ${selSubId===s.id?T.warning:T.warningBorder}`,background:T.warningBg,cursor:"pointer",fontFamily:"inherit",textAlign:"left",opacity:0.9}}>
                            <div style={{width:14,height:14,borderRadius:"50%",flexShrink:0,border:`1.5px solid ${T.warning}`,display:"flex",alignItems:"center",justifyContent:"center",background:selSubId===s.id?T.warning:"transparent"}}>
                              {selSubId===s.id&&<div style={{width:5,height:5,borderRadius:"50%",background:"#fff"}}/>}
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:5}}><p style={{fontSize:11,fontWeight:600,color:T.text,margin:0}}>{s.label}</p><Badge color={T.warning} bg={T.warningBg} border={T.warningBorder} small>停止中</Badge></div>
                              <p style={{fontSize:9,color:T.textMeta,margin:"1px 0 0"}}>停止理由：{s.pauseReason||"—"}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* タブ */}
        <nav style={{display:"flex",background:T.surface,borderBottom:`1px solid ${T.border}`}}>
          {[{k:"sub",l:"注文詳細/変更",show:hasSubs},{k:"orders",l:"注文履歴",show:true}]
            .filter(t=>t.show).map(t=>(
              <button key={t.k} onClick={()=>setTab(t.k)} className="hbtn" role="tab" aria-selected={tab===t.k}
                style={{flex:1,padding:"9px 4px",fontSize:10,fontWeight:700,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",color:tab===t.k?T.primary:T.textMeta,letterSpacing:0.3,borderBottom:tab===t.k?`2px solid ${T.primary}`:`2px solid transparent`,minHeight:38,transition:"all 0.15s",position:"relative"}}>
                {t.l}

              </button>
            ))}
        </nav>

        {/* 定期なし */}
        {!hasSubs&&(
          <div style={{padding:"14px 12px"}}>
            <div style={{background:T.raised,borderRadius:10,padding:"14px",textAlign:"center",border:`1px solid ${T.border}`,marginBottom:10}}>
              <Ic d={ic.single} size={24} color={T.textMeta}/>
              <p style={{fontSize:12,fontWeight:700,color:T.textSub,margin:"8px 0 4px"}}>定期便なし</p>
              <p style={{fontSize:10,color:T.textMeta,lineHeight:1.6,margin:"0 0 10px"}}>単品購入のみの顧客です</p>
              <button onClick={()=>setSheet("singleTemplate")} className="hbtn"
                style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${T.primaryBorder}`,background:T.primaryXLight,color:T.primaryDark,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:6}}>
                単品テンプレで別送作成
              </button>
              <button onClick={()=>done("定期申し込みURLをメール送信しました")} className="hbtn"
                style={{padding:"8px 16px",borderRadius:8,border:"none",background:T.primary,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 10px rgba(168,120,128,0.28)"}}>
                定期申し込みURLをメール送信
              </button>
            </div>
          </div>
        )}

        {/* ━━ 定期情報タブ ━━ */}
        {hasSubs&&tab==="sub"&&sub&&(
          <main>
            {/* 停止中バナー */}
            {isSubPaused&&(
              <div style={{background:T.warningBg,borderBottom:`1px solid ${T.warningBorder}`,padding:"10px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Ic d={ic.pause} size={13} color={T.warning} sw={1.6}/>
                  <div>
                    <p style={{fontSize:11,fontWeight:700,color:T.warning,margin:0}}>一時停止中</p>
                    <p style={{fontSize:9,color:T.textSub,margin:"1px 0 0"}}>停止理由：{sub.pauseReason||"—"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 定期ステータス + 主要操作 */}
            <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"8px 14px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0,overflow:"hidden"}}>
                  <span style={{fontSize:10,fontWeight:700,color:T.textSub,flexShrink:0}}>対象定期</span>
                  <span style={{fontSize:10,color:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sub.label}</span>
                </div>
                <Badge color={subStatusColor} bg={subStatusBg} border={subStatusBorder} small>{subStatusLabel}</Badge>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                <button onClick={()=>setSheet(isSubPaused?"resume":"pause")} className="hbtn"
                  style={{padding:"8px 0",borderRadius:8,border:`1px solid ${isSubPaused?T.successBorder:T.warningBorder}`,background:isSubPaused?T.successBg:T.warningBg,color:isSubPaused?T.success:T.warning,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",minHeight:36}}>
                  {isSubPaused?"定期再開":"定期停止"}
                </button>
                <button onClick={()=>setSheet("cancel")} className="hbtn"
                  style={{padding:"8px 0",borderRadius:8,border:`1px solid ${T.dangerBorder}`,background:T.dangerBg,color:T.danger,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",minHeight:36}}>
                  キャンセル処理
                </button>
              </div>
            </div>

            {/* 次回注文カード */}
            <div style={{background:T.card,padding:"11px 14px",borderBottom:`1px solid ${T.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{display:"flex",alignItems:"baseline",gap:7,flexWrap:"wrap"}}>
                  <p style={{fontSize:12,fontWeight:800,color:T.text,margin:0}}>注文番号 {childOrderNo}</p>
                  <p style={{fontSize:9,color:T.textMeta,margin:0}}>注文ID {childNumId}</p>
                </div>
                {childStatusInfo&&<Badge color={childStatusInfo.color} bg={childStatusInfo.bg} border={childStatusInfo.border} small>{childStatus||"—"}</Badge>}
              </div>

              <div style={{marginTop:7,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
                {childDisplayItems.map((li,idx)=>{
                  const lineTotal=Number(li.price||0)*Number(li.qty||0);
                  return(
                    <div key={`${li.name}-${idx}`} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 9px",borderBottom:`1px solid ${T.border}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:4,minWidth:0}}>
                        <p style={{fontSize:10,fontWeight:700,color:T.text,margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{li.type==="single_add"?"＋ ":""}{li.name} {li.size} ×{li.qty}</p>
                        {li.type==="single_add"&&<Badge color={T.warning} bg={T.warningBg} border={T.warningBorder} small>単品追加</Badge>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:5,marginLeft:6}}>
                        <span style={{fontSize:10,fontWeight:700,color:T.textSub}}>{fmtP(lineTotal)}</span>
                        <button onClick={()=>openLineItemEdit(idx)} className="hbtn"
                          style={{background:"none",border:"none",padding:2,cursor:"pointer",display:"flex",alignItems:"center",opacity:0.55}}>
                          <Ic d={ic.pen} size={10} color={T.textMeta}/>
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 9px",borderBottom:`1px solid ${T.border}`}}>
                  <span style={{fontSize:9,color:T.textSub}}>ポイント利用</span>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{fontSize:10,fontWeight:700,color:pointsUsed>0?T.warning:T.textSub}}>{pointsUsed>0?`-¥${pointsUsed.toLocaleString()}`:"¥0"}</span>
                    <button onClick={()=>setSheet("points")} className="hbtn"
                      style={{background:"none",border:"none",padding:2,cursor:"pointer",display:"flex",alignItems:"center",opacity:0.55}}>
                      <Ic d={ic.pen} size={10} color={T.textMeta}/>
                    </button>
                  </div>
                </div>
                {couponDiscount>0&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 9px",borderBottom:`1px solid ${T.border}`}}><span style={{fontSize:9,color:T.textSub}}>クーポン</span><span style={{fontSize:10,fontWeight:700,color:T.warning}}>-¥{couponDiscount.toLocaleString()}</span></div>}
                {shippingFee>0&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 9px",borderBottom:`1px solid ${T.border}`}}><span style={{fontSize:9,color:T.textSub}}>送料</span><span style={{fontSize:10,fontWeight:700,color:T.textSub}}>¥{shippingFee.toLocaleString()}</span></div>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 9px",background:T.primaryXLight,borderTop:`1px solid ${T.primaryBorder}`}}>
                  <span style={{fontSize:9,color:T.textSub,fontWeight:700}}>今回の請求合計</span>
                  <span style={{fontSize:16,fontWeight:800,color:T.primaryDark}}>¥{childTotal.toLocaleString()}</span>
                </div>
              </div>

              <div style={{marginTop:8,border:`1px solid ${T.border}`,borderRadius:8,background:T.surface,padding:"0 8px"}}>
                <OrderEditRow iconKey="calendar" label="お届け / 発送日"
                  value={`${fmtDS(child?.deliveryDate||sub.nextDate)}（発送 ${fmtDS(child?.shipDate)}）`}
                  onEdit={()=>setSheet("date")}/>
                <OrderEditRow iconKey="clock" label="時間帯" value={sub.timeSlot||"指定なし"} onEdit={()=>setSheet("time")}/>
                <OrderEditRow iconKey="repeat" label="コース / サイクル" value={`${sub.course||"—"} / ${sub.freqLabel}ごと`} onEdit={()=>setSheet("freq")}/>
                <OrderEditRow iconKey="truck" label="配送先" value={customer.address||"—"} onEdit={()=>setSheet("address")}/>
                <OrderEditRow iconKey="shipBox" label="配送会社" value="ヤマト運輸" onEdit={()=>done("配送会社を更新しました")}/>
                <OrderEditRow iconKey="credit" label="支払い方法" value={`クレジットカード ${sub.payment||""}`.trim()} onEdit={()=>done("カード変更URLをメール送信しました")}/>
                <OrderEditRow iconKey="note" label="店舗内" value="メモを追加する" onEdit={()=>setSheet("storeNote")} last/>
              </div>
              {!child?.editable&&<p style={{fontSize:9,color:T.textMeta,margin:"5px 0 0"}}>※ この注文は確定済みです。変更内容は次回注文から反映します。</p>}

            </div>

            {/* ★ 業務操作カテゴリ */}
            <Section iconKey="layers" title="STEP 4 業務操作カテゴリ" defaultOpen={true}
              right={<span style={{fontSize:8,color:T.primary,border:`1px solid ${T.primaryBorder}`,background:T.primaryXLight,borderRadius:99,padding:"0 6px",lineHeight:"15px"}}>拡張運用</span>}>
              <div style={{padding:"7px 10px 10px",display:"flex",flexDirection:"column",gap:6}}>
                <div style={{background:T.raised,border:`1px solid ${T.border}`,borderRadius:7,padding:"6px 8px"}}>
                  <p style={{fontSize:9,color:T.textMeta,margin:0,lineHeight:1.6}}>処理対象が増えても迷わないよう、カテゴリ別に運用します。</p>
                </div>
                {operationGroups.map((group,idx)=>(
                  <Section key={group.title} iconKey={group.iconKey} title={group.title} defaultOpen={group.defaultOpen} noBorder={idx===0}
                    right={<span style={{fontSize:8,color:T.textMeta,border:`1px solid ${T.border}`,borderRadius:99,padding:"0 6px",lineHeight:"15px"}}>{group.items.length}件</span>}>
                    <div style={{padding:"7px 10px 10px",display:"flex",flexDirection:"column",gap:5}}>
                      <p style={{fontSize:9,color:T.textMeta,margin:0,lineHeight:1.6}}>{group.note}</p>
                      {group.items.map(item=>{
                        const tone=actionTone[item.variant]||actionTone.ghost;
                        const st=statusTone[item.status]||statusTone.api;
                        return(
                          <button key={`${group.title}-${item.label}`} onClick={item.onClick} className="hbtn"
                            style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 10px",borderRadius:8,border:`1px solid ${tone.border}`,background:tone.bg,color:tone.color,cursor:"pointer",fontFamily:"inherit",textAlign:"left",minHeight:36}}>
                            <span style={{display:"flex",alignItems:"center",gap:6,minWidth:0,flex:1}}>
                              <Ic d={ic[item.iconKey]} size={11} color={tone.color} sw={1.8}/>
                              <span style={{fontSize:10,fontWeight:700,color:T.text,lineHeight:1.45,wordBreak:"break-word"}}>{item.label}</span>
                            </span>
                            <Badge color={st.color} bg={st.bg} border={st.border} small>{st.label}</Badge>
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                ))}
              </div>
            </Section>
          </main>
        )}

        {/* ━━ 注文履歴タブ ━━ */}
        {tab==="orders"&&(
          <main>
            {/* ★ 単品注文セクション */}
            {singleOrders.length>0&&(
              <Section iconKey="single" title="単品注文" noBorder countBadge={singleOrders.length}>
                {singleOrders.map((o,i)=>{
                  const st=ORDER_STATUS[o.status]||{color:T.textMeta,bg:T.raised,border:T.border};
                  return(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 16px",borderBottom:`1px solid ${T.border}`,background:o.status==="支払待ち"?T.warningBg:"transparent"}}>
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,fontWeight:600,color:T.text}}>{o.id}</span>
                          <span style={{fontSize:9,color:T.textMeta}}>{o.date}</span>
                          {o.templateLabel&&<Badge color={T.primary} bg={T.primaryLight} border={T.primaryBorder} small>{o.templateLabel}</Badge>}
                        </div>
                        <p style={{fontSize:10,color:T.textSub,margin:"2px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.items}</p>
                      </div>
                      <div style={{textAlign:"right",marginLeft:8,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                        <Badge color={st.color} bg={st.bg} border={st.border} small dot>{o.status}</Badge>
                        <p style={{fontSize:11,fontWeight:700,color:T.primaryDark,margin:"3px 0 0",fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{o.amt}</p>
                        <button onClick={()=>openSingleOrderEdit(o.id)} className="hbtn"
                          style={{background:"none",border:"none",padding:0,cursor:"pointer",fontSize:9,fontWeight:700,color:T.textMeta,textDecoration:"underline",textUnderlineOffset:2,fontFamily:"inherit"}}>
                          編集
                        </button>
                      </div>
                    </div>
                  );
                })}
              </Section>
            )}
            {/* 定期注文履歴 */}
            <Section iconKey="history" title="定期注文履歴" noBorder={singleOrders.length===0}>
              {customer.orders.filter(o=>!o.isSingle).map((o,i)=>{
                const st=ORDER_STATUS[o.status]||{color:T.textMeta,bg:"transparent",border:T.border,editable:false};
                return(
                  <details key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                    <summary className="hbtn" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 14px",userSelect:"none",background:T.card,minHeight:42}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <Ic d={ic.chevR} size={10} color={T.textMeta}/>
                        <div>
                          <span style={{fontSize:11,fontWeight:600,color:T.text}}>{o.id}</span>
                          <span style={{fontSize:9,color:T.textMeta,marginLeft:5}}>{o.date}</span>
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <Badge color={st.color} bg={st.bg} border={st.border} small>{o.status}</Badge>
                        <span style={{fontSize:11,fontWeight:700,color:T.primaryDark,fontFamily:"'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic UI',sans-serif"}}>{o.amt}</span>
                      </div>
                    </summary>
                    <div style={{background:T.surface,padding:"7px 14px 9px"}}>
                      <EditRow label="商品" value={o.items}/>
                      {st.editable&&<div style={{padding:"6px 0 2px"}}><Btn label="今回だけキャンセル" iconKey="trash" variant="warning" onClick={()=>done("今回の注文をキャンセルしました","warning")}/></div>}
                    </div>
                  </details>
                );
              })}
            </Section>
          </main>
        )}

      </>)}
    </div>

    {sheet==="date"      &&sub&&<SheetDate       sub={sub}  onClose={()=>setSheet(null)} onDone={done}/>}
    {sheet==="time"      &&sub&&<SheetTime       sub={sub}  onClose={()=>setSheet(null)} onDone={done}/>}
    {sheet==="freq"      &&sub&&<SheetFreqWizard sub={sub}  onClose={()=>setSheet(null)} onDone={done}/>}
    {sheet==="products"  &&sub&&<SheetProducts   sub={sub}  onClose={()=>setSheet(null)} onDone={done}/>}
    {sheet==="address"        &&<SheetAddress customer={customer} sub={sub} onClose={()=>setSheet(null)} onDone={done}/>}
    {sheet==="regInfo"        &&<SheetRegistrationInfo customer={customer} onClose={()=>setSheet(null)} onSave={saveRegistrationInfo} onNotify={notify}/>}
    {sheet==="pause"     &&sub&&<SheetPause                onClose={()=>setSheet(null)} onDone={done}/>}
    {sheet==="resume"    &&sub&&<SheetResume     sub={sub}  onClose={()=>setSheet(null)} onDone={done}/>}
    {sheet==="cancel"    &&sub&&<SheetCancel     sub={sub}  onClose={()=>setSheet(null)} onDone={done}/>}
    {sheet==="storeNote"      &&<SheetStoreNote             onClose={()=>setSheet(null)} onDone={done}/>}
    {sheet==="lineItem"  &&editingLineItem&&<SheetLineItemEdit item={editingLineItem} onClose={closeLineItemEdit} onSave={saveLineItemEdit}/>}
    {sheet==="points"    &&sub&&<SheetPointsEdit value={pointsUsed} onClose={()=>setSheet(null)} onSave={savePointsEdit}/>}
    {sheet==="singleOrder"&&editingSingleOrder&&<SheetSingleOrderEdit order={editingSingleOrder} onClose={closeSingleOrderEdit} onSave={saveSingleOrderEdit} onCancel={cancelSingleOrderEdit}/>}
    {sheet==="onboard"        &&<SheetFirstOrderEntry       onClose={()=>setSheet(null)} onSubmit={handleFirstOrderCreate}/>}
    {sheet==="singleTemplate" &&<SheetSingleTemplate        onClose={()=>setSheet(null)} onSubmit={handleCreateSingleTemplate}/>}
    {toasts.map(t=><Toast key={t.id} msg={t.msg} type={t.type} onDismiss={()=>rmToast(t.id)}/>)}
  </>);
}

















