import styles from './ProductProofCover.module.css'

const CDN='https://cdn.sanity.io/images/iq6vjwu7/production/'
const screens={
 kyc:[
  {key:'empty',src:CDN+'d289dd68fd04594fe21f8b02b09841a48dad6656-360x804.png',alt:'KYC Review hub with both tasks available'},
  {key:'saved',src:CDN+'8a80b193775e31e94226b66c3ff78ab863c89b62-360x804.png',alt:'KYC hub with one task saved'},
  {key:'ready',src:CDN+'f9ba96fbc4ef17ce6d5bf6dc73b1ec8c26d16ab2-360x804.png',alt:'KYC hub with both tasks complete'},
 ],
 qris:[
  {key:'amount',src:CDN+'59c364928a0c0f8d371b5c4827c32cdffe59f74a-360x805.png',alt:'QRIS amount and fee selection'},
  {key:'code',src:CDN+'3f1ad9eb42fd63c88fcb66e9861966a8dbfb71a0-360x805.png',alt:'One-time QR payment code'},
  {key:'success',src:CDN+'00d327e655f5f733d434bae5d7dead2cf5fb0221-360x805.png',alt:'QRIS success confirmation'},
 ],
 kybai:[
  {key:'warning',src:CDN+'cc8c4bb6d433718f1a76451aec446c6ce18772d3-1440x1231.png',alt:'Actual grouped caution modal within KYB dashboard'},
  {key:'correction',src:CDN+'a0b7dfc8f728887d40348ce534b566dcf0a4ee46-1440x1383.png',alt:'Actual inline correction state in KYB dashboard'}
 ],
 kybops:[
  {key:'review',src:CDN+'1f4c2642797b23c15379c66eb690ec4b8e0602fd-2016x982.png',alt:'One-page Operations KYB review workspace'},
  {key:'instant',src:CDN+'f384a00073ff13f23728680bfc8c89f0e6dbc7bb-1440x854.png',alt:'KYB reviewer Instant Approve interface'}
 ]
}
const cases={
 'kyc-autosave-astrapay':{key:'kyc',label:'CONSUMER KYC',style:'mobile'},
 'qris-topup-astrapay':{key:'qris',label:'CONSUMER PAYMENTS',style:'mobile'},
 'ai-precheck-kyb':{key:'kybai',label:'MERCHANT KYB · AI',style:'desktop'},
 'ai-image-checking-kyb-astrapay':{key:'kybops',label:'OPERATIONS · ADMIN WEB',style:'desktop'}
}
export default function ProductProofCover({slug}){
 const config=cases[slug]
 if(!config)return null
 const images=screens[config.key]
 const rootClasses=[styles.cover,config.style==='mobile'?styles.mobile:styles.desktop,styles[config.key]].join(' ')
 return <div className={rootClasses} aria-label={images.map(x=>x.alt).join('; ')}>
   <div className={styles.label}><span className={styles.dot}/> {config.label}</div>
   <div className={styles.imageRow} aria-hidden="true">
    {images.map(x=><div key={x.key} className={[styles.frame,styles[x.key]].join(' ')}>
      <img src={x.src} alt="" loading="lazy"/>
    </div>)}
   </div>
   <div className={styles.footer} aria-hidden="true"><span>REAL PRODUCT UI</span><span>↗</span></div>
  </div>
}
