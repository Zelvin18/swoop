// Mock data — used as fallback when Supabase is not yet connected
// Replace with real Supabase queries once DB is set up

export const MOCK_SELLERS = [
  { id:'1', name:'TechPlug UG',    username:'techplug_ug',   verified:true,  color:'#7C3AED', initials:'TP', followers:'89K',  location:'Kampala, Uganda',  rating:4.9 },
  { id:'2', name:'Kickz Hub UG',   username:'kickzhubug',    verified:true,  color:'#E11D48', initials:'KH', followers:'128K', location:'Kampala, Uganda',  rating:4.8 },
  { id:'3', name:'StyleHub UG',    username:'stylehub_ug',   verified:true,  color:'#F97316', initials:'SH', followers:'54K',  location:'Kampala, Uganda',  rating:4.7 },
  { id:'4', name:'Sneaker Vault',  username:'sneakervaultug',verified:true,  color:'#06B6D4', initials:'SV', followers:'76K',  location:'Kampala, Uganda',  rating:4.9 },
  { id:'5', name:'FurnishUG',      username:'furnishug',     verified:false, color:'#22C55E', initials:'FK', followers:'12K',  location:'Entebbe, Uganda',  rating:4.5 },
  { id:'6', name:'Gadget World UG',username:'gadgetworldug', verified:true,  color:'#8B5CF6', initials:'GW', followers:'210K', location:'Kampala, Uganda',  rating:4.8 },
]

export const MOCK_POSTS = [
  {
    id:'1', seller_id:'1',
    title:'iPhone 13 Pro Max',
    description:'256GB • Graphite • Excellent condition',
    price: 3800000, orig_price: 4500000,
    category:'Phones', condition:'Used - Like New',
    trust_badges:['Verified Seller','Delivery Available','7 Days Return'],
    location:'Kampala, Uganda', distance:'2 km away',
    likes_count:2800, comments_count:148, saves_count:32, shares_count:256,
    is_hot:true, emoji:'📱',
    bg:'linear-gradient(135deg,#1a1a2e,#0f3460)',
  },
  {
    id:'2', seller_id:'2',
    title:'Nike Air Jordan 1 Mid',
    description:'Black / White / Grey • Size 42',
    price: 580000, orig_price: 720000,
    category:'Sneakers', condition:'Brand New',
    trust_badges:['Free Delivery','Verified Seller','7 Days Return'],
    location:'Kampala, Uganda', distance:'2.3 km away',
    likes_count:12400, comments_count:842, saves_count:23, shares_count:2300,
    is_hot:true, emoji:'👟',
    bg:'linear-gradient(135deg,#1a1200,#2d2000)',
  },
  {
    id:'3', seller_id:'3',
    title:'Zara Puffer Jacket',
    description:'Size M • Black • Brand New with Tags',
    price: 210000, orig_price: 310000,
    category:'Fashion', condition:'Brand New',
    trust_badges:['Free Delivery','Verified Seller'],
    location:'Kampala, Uganda', distance:'5 km away',
    likes_count:3200, comments_count:94, saves_count:18, shares_count:180,
    is_hot:false, emoji:'🧥',
    bg:'linear-gradient(135deg,#0a0a1a,#1a0a2e)',
  },
  {
    id:'4', seller_id:'4',
    title:'Yeezy 350 V2 Zebra',
    description:'Size 41 • White/Black • DS',
    price: 780000, orig_price: 1050000,
    category:'Sneakers', condition:'Brand New',
    trust_badges:['Free Delivery','Verified Seller','7 Days Return'],
    location:'Kampala, Uganda', distance:'8 km away',
    likes_count:8600, comments_count:320, saves_count:41, shares_count:1100,
    is_hot:true, emoji:'👟',
    bg:'linear-gradient(135deg,#1a1a1a,#2d2d2d)',
  },
  {
    id:'5', seller_id:'5',
    title:'3 Seater Modern Sofa',
    description:'Grey • L-Shape • Excellent condition',
    price: 980000, orig_price: 1500000,
    category:'Home', condition:'Used - Like New',
    trust_badges:['Delivery Available','Verified Seller'],
    location:'Entebbe, Uganda', distance:'3 km away',
    likes_count:940, comments_count:58, saves_count:12, shares_count:76,
    is_hot:false, emoji:'🛋️',
    bg:'linear-gradient(135deg,#1a1500,#2d2400)',
  },
  {
    id:'6', seller_id:'6',
    title:'iPhone 14 Pro Max',
    description:'256GB • Deep Purple • Pristine',
    price: 5200000, orig_price: 6200000,
    category:'Phones', condition:'Used - Like New',
    trust_badges:['Verified Seller','Delivery Available','7 Days Return'],
    location:'Kampala, Uganda', distance:'1.5 km away',
    likes_count:15200, comments_count:1240, saves_count:57, shares_count:3400,
    is_hot:true, emoji:'📱',
    bg:'linear-gradient(135deg,#1a001a,#2d0050)',
  },
]

export const MOCK_REQUESTS = [
  { id:'1', buyer_name:'Kevin Ssekandi', buyer_initials:'KS', buyer_color:'#3B82F6', verified:true,  location:'Kampala, Uganda', time:'15 min ago', title:'iPhone 13 Pro Max',   description:'Looking for iPhone 13 Pro Max in excellent condition.', budget:3500000, color_pref:'Any Color',   radius:10, offers_count:7  },
  { id:'2', buyer_name:'Amina Nakato',   buyer_initials:'AN', buyer_color:'#EC4899', verified:false, location:'Entebbe, Uganda', time:'1 hr ago',   title:'L-Shaped Sofa',       description:'Need a modern L-shaped sofa. Budget is flexible.',      budget:900000,  color_pref:'Gray / Beige',radius:20, offers_count:12 },
  { id:'3', buyer_name:'Brian Mugisha',  buyer_initials:'BM', buyer_color:'#22C55E', verified:true,  location:'Kampala, Uganda', time:'2 hrs ago',  title:'MacBook Air M1',      description:'Looking for MacBook Air M1, 256GB and above.',          budget:3800000, color_pref:'Any Color',   radius:15, offers_count:5  },
  { id:'4', buyer_name:'Grace Namusoke', buyer_initials:'GN', buyer_color:'#F59E0B', verified:true,  location:'Kampala, Uganda', time:'3 hrs ago',  title:'Sony WH-1000XM5',     description:'Looking for Sony noise-cancelling headphones.',          budget:1100000, color_pref:'Black/Silver',radius:25, offers_count:3  },
  { id:'5', buyer_name:'David Kiggundu', buyer_initials:'DK', buyer_color:'#8B5CF6', verified:false, location:'Kampala, Uganda', time:'5 hrs ago',  title:'PS5 Console',         description:'PS5 disc edition with at least 2 controllers.',          budget:2300000, color_pref:'White',       radius:10, offers_count:9  },
]

export function formatUGX(n) {
  return `UGX ${n.toLocaleString('en-UG')}`
}

export function discount(price, orig) {
  return `-${Math.round((1 - price/orig)*100)}%`
}
