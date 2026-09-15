(() => {
  const { createClient } = window.supabase;
  const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const $=id=>document.getElementById(id);
  let products=[]; let cart=JSON.parse(localStorage.getItem('drapeAuraCart')||'[]'); let currentFilter='All'; let currentUser=null;
  const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2})}`;
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const totalStock=p=>(p.product_variants||[]).reduce((s,v)=>s+Number(v.stock_quantity||0),0);
  function saveCart(){localStorage.setItem('drapeAuraCart',JSON.stringify(cart));renderCart();updateCount();}
  function updateCount(){$('count').textContent=cart.reduce((s,i)=>s+i.quantity,0);}
  function open(id){const el=$(id);if(!el)return;el.classList.remove('hidden');document.body.classList.add('no-scroll');}
  function updateAccountLabel(user){const label=$('accountLabel');if(!label)return;const name=user?.user_metadata?.full_name?.trim()||user?.email?.split('@')[0]||'';label.textContent=user?`Hi, ${name}`:'';}
  function close(id){const el=$(id);if(!el)return;el.classList.add('hidden');if(!document.querySelector('.overlay:not(.hidden)'))document.body.classList.remove('no-scroll');}
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();close(b.dataset.close);}));
  document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)close(o.id)}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.overlay:not(.hidden)').forEach(o=>close(o.id));}});
  $('searchBtn').onclick=()=>{open('searchPanel');setTimeout(()=>$('searchInput').focus(),50);};
  $('accountBtn').onclick=async()=>{await renderAccount();open('accountPanel');}; $('cartBtn').onclick=()=>{renderCart();open('cartPanel');};

  function accountLoggedOut(){return `<h2>Your style, your account.</h2><p class="account-intro">Sign in to view your orders, manage your details and enjoy a smoother checkout.</p><form id="loginForm" class="account-form"><label>Email<input id="loginEmail" type="email" required placeholder="you@example.com"></label><label>Password<input id="loginPassword" type="password" required placeholder="Your password"></label><button class="button full-btn" type="submit">Sign In</button><button class="text-link" type="button" id="forgotBtn">Forgot Password?</button><p class="auth-msg" id="authMsg"></p></form><div class="account-switch">New to Drape & Aura? <button type="button" id="signupSwitch">Create Account</button></div>`;}
  function accountSignup(){return `<h2>Create your account</h2><p class="account-intro">Join Drape & Aura to keep your orders and details together.</p><form id="signupForm" class="account-form"><label>Full Name<input id="signupName" type="text" required placeholder="Your name"></label><label>Phone<input id="signupPhone" type="tel" placeholder="10-digit mobile number"></label><label>Email<input id="signupEmail" type="email" required placeholder="you@example.com"></label><label>Password<input id="signupPassword" type="password" minlength="6" required placeholder="At least 6 characters"></label><button class="button full-btn" type="submit">Create Account</button><p class="auth-msg" id="authMsg"></p></form><div class="account-switch">Already have an account? <button type="button" id="loginSwitch">Sign In</button></div>`;}
  function accountReset(){return `<h2>Set a new password</h2><p class="account-intro">Choose a new password for your Drape & Aura account.</p><form id="resetForm" class="account-form"><label>New Password<input id="newPassword" type="password" minlength="6" required placeholder="New password"></label><label>Confirm Password<input id="confirmPassword" type="password" minlength="6" required placeholder="Repeat password"></label><button class="button full-btn" type="submit">Update Password</button><p class="auth-msg" id="authMsg"></p></form>`;}
  async function upsertProfile(user, extra={}){if(!user)return; const {error}=await supabase.from('profiles').upsert({id:user.id,full_name:extra.full_name??user.user_metadata?.full_name??null,phone:extra.phone??user.user_metadata?.phone??null,updated_at:new Date().toISOString()}); if(error)console.warn('Profile save:',error.message);}
  async function renderAccount(){
    const {data:{session}}=await supabase.auth.getSession(); currentUser=session?.user||null;
    const {data:{session:latest}}=await supabase.auth.getSession();
    if(latest?.user && window.location.hash.includes('type=recovery')){$('accountView').innerHTML=accountReset();bindAccountReset();return;}
    updateAccountLabel(currentUser);
    if(currentUser){await renderAccountHome();} else {renderLogin();}
  }
  function renderLogin(){ $('accountView').innerHTML=accountLoggedOut(); $('loginForm').onsubmit=login; $('forgotBtn').onclick=sendCustomerReset; $('signupSwitch').onclick=()=>{ $('accountView').innerHTML=accountSignup(); $('signupForm').onsubmit=signup; $('loginSwitch').onclick=renderLogin; }; }
  async function login(e){e.preventDefault();const msg=$('authMsg');msg.textContent='Signing in…';const {data,error}=await supabase.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});if(error){msg.textContent=error.message;return;}currentUser=data.user;await upsertProfile(currentUser);updateAccountLabel(currentUser);await renderAccountHome();close('accountPanel');}
  async function signup(e){e.preventDefault();const msg=$('authMsg');msg.textContent='Creating your account…';const email=$('signupEmail').value.trim(),password=$('signupPassword').value,name=$('signupName').value.trim(),phone=$('signupPhone').value.trim();const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name,phone}}});if(error){msg.textContent=error.message;return;}if(data.session&&data.user){await upsertProfile(data.user,{full_name:name,phone});currentUser=data.user;await renderAccountHome();}else{msg.textContent='Account created. Please check your email to confirm your account, then sign in.';}}
  async function sendCustomerReset(){const email=$('loginEmail').value.trim(),msg=$('authMsg');if(!email){msg.textContent='Enter your email first.';return;}msg.textContent='Sending reset link…';const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/`});msg.textContent=error?error.message:'Password reset email sent. Check your inbox.';}
  function bindAccountReset(){$('resetForm').onsubmit=async e=>{e.preventDefault();const msg=$('authMsg'),p=$('newPassword').value,c=$('confirmPassword').value;if(p!==c){msg.textContent='Passwords do not match.';return;}msg.textContent='Updating password…';const {error}=await supabase.auth.updateUser({password:p});if(error){msg.textContent=error.message;return;}msg.textContent='Password updated successfully. You can now sign in.';setTimeout(()=>{history.replaceState(null,'',window.location.pathname);supabase.auth.signOut();renderLogin();},1000);};}
  async function renderAccountHome(){const {data:{user}}=await supabase.auth.getUser();currentUser=user;if(!user){renderLogin();return;}const {data:orders,error}=await supabase.from('orders').select('id,created_at,total_amount,order_status,payment_status,order_items(product_name,variant_label,quantity,unit_price,line_total)').eq('user_id',user.id).order('created_at',{ascending:false});const orderHtml=error?'<p class="muted-note">Unable to load order history right now.</p>':(orders?.length?orders.map(o=>`<div class="order-card"><div class="order-head"><strong>Order ${esc(o.id.slice(0,8).toUpperCase())}</strong><span>${new Date(o.created_at).toLocaleDateString('en-IN')}</span></div><div class="order-status">${esc(o.order_status||'pending')}</div><div class="order-items">${(o.order_items||[]).map(i=>`<div>${esc(i.product_name)} · ${esc(i.variant_label||'')} × ${i.quantity}</div>`).join('')}</div><b>${money(o.total_amount)}</b></div>`).join(''):'<p class="muted-note">You have no orders yet.</p>');$('accountView').innerHTML=`<h2>Hello, ${esc(user.user_metadata?.full_name||user.email?.split('@')[0]||'there')}.</h2><p class="account-intro">Welcome back. Here is your recent order history.</p><div class="account-email">${esc(user.email||'')}</div><h3 class="account-section-title">Your Orders</h3><div class="orders-list">${orderHtml}</div><button class="text-link" id="logoutBtn">Sign Out</button>`;$('logoutBtn').onclick=async()=>{await supabase.auth.signOut();currentUser=null;updateAccountLabel(null);renderLogin();};}
  supabase.auth.onAuthStateChange((event,session)=>{currentUser=session?.user||null;updateAccountLabel(currentUser);if(event==='PASSWORD_RECOVERY'&&$('accountPanel')&&!$('accountPanel').classList.contains('hidden')){$('accountView').innerHTML=accountReset();bindAccountReset();}});

  function card(p){const stock=totalStock(p);const sold=!p.available||stock<=0;const badges=`<div class="card-badges">${sold?'<em class="off">Out of Stock</em>':(p.new_arrival?'<em class="new">New Arrival</em>':'')}</div>`;const img=p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">`:'<span>Product image</span>';return `<article class="product-card"><button class="product-image" data-id="${p.id}">${img}${badges}</button><button class="product-name" data-id="${p.id}">${esc(p.name)}</button><p>${money(p.price)}</p><button class="add" data-id="${p.id}" ${sold?'disabled':''}>${sold?'Out of Stock':'♡  Add to Cart'}</button></article>`;}
  function renderShop(){const list=currentFilter==='All'?products:products.filter(p=>p.category===currentFilter);$('shopGrid').innerHTML=list.length?list.map(card).join(''):'<div class="loading-card">No products in this category yet.</div>';bindProductButtons();}
  function renderNew(){const list=products.filter(p=>p.new_arrival);$('newGrid').innerHTML=list.length?list.slice(0,4).map(card).join(''):'<div class="loading-card">New arrivals will appear here soon.</div>';bindProductButtons();}
  function bindProductButtons(){
    document.querySelectorAll('.product-image,.product-name').forEach(b=>{
      b.onclick=e=>{e.preventDefault();e.stopPropagation();showProduct(b.dataset.id);};
    });
    document.querySelectorAll('.add').forEach(b=>{
      b.onclick=e=>{
        e.preventDefault();
        e.stopPropagation();
        if(!b.disabled) showProduct(b.dataset.id);
      };
    });
  }
  function showProduct(id){
    const p=products.find(x=>x.id===id); if(!p)return;
    const vars=p.product_variants||[];
    const availableVars=vars.filter(v=>Number(v.stock_quantity)>0);
    const sold=!p.available||availableVars.length===0;
    const firstAvailable=availableVars[0];
    const variantHtml=vars.length?`<label class="variant-select">${vars.length>1?'Choose size / colour':'Size / Colour'}<select id="detailVariant">${vars.map(v=>`<option value="${v.id}" ${v.id===firstAvailable?.id?'selected':''} ${Number(v.stock_quantity)<=0?'disabled':''}>${esc(v.size||'One Size')}${v.color?' — '+esc(v.color):''}${Number(v.stock_quantity)<=0?' — Out of stock':''}</option>`).join('')}</select></label>`:'';
    const qtyHtml=!sold?`<div class="quantity-picker"><span>Quantity</span><div class="quantity-controls"><button type="button" id="qtyMinus" aria-label="Decrease quantity">−</button><input id="detailQuantity" type="number" min="1" max="${Number(firstAvailable?.stock_quantity||1)}" value="1" inputmode="numeric"><button type="button" id="qtyPlus" aria-label="Increase quantity">+</button></div><small id="stockNote" class="stock-note"></small></div>`:'';
    $('productDetail').innerHTML=`<div class="detail-grid"><div class="detail-image">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'Product image'}</div><div><p class="eyebrow">${esc(p.category)}</p><h2>${esc(p.name)}</h2><p class="detail-price">${money(p.price)}</p><p class="detail-description">${esc(p.description||'')}</p>${variantHtml}${qtyHtml}<button class="button full-btn" id="detailAdd" ${sold?'disabled':''}>${sold?'Out of Stock':'Add to Cart'}</button></div></div>`;
    if(!sold){
      const select=$('detailVariant'), qty=$('detailQuantity'), note=$('stockNote');
      const syncQty=()=>{const v=vars.find(x=>x.id===select.value);const max=Number(v?.stock_quantity||0);qty.max=String(Math.max(1,max));if(Number(qty.value)<1)qty.value=1;if(Number(qty.value)>max)qty.value=max;note.textContent=`${max} available`;};
      select.onchange=syncQty;
      $('qtyMinus').onclick=()=>{qty.value=Math.max(1,Number(qty.value||1)-1);syncQty();};
      $('qtyPlus').onclick=()=>{const max=Number(vars.find(x=>x.id===select.value)?.stock_quantity||1);qty.value=Math.min(max,Number(qty.value||1)+1);syncQty();};
      qty.oninput=syncQty;
      syncQty();
      $('detailAdd').onclick=e=>{e.preventDefault();e.stopPropagation();const v=vars.find(x=>x.id===select.value);if(!v||Number(v.stock_quantity)<=0)return;const quantity=Math.max(1,Math.min(Number(qty.value||1),Number(v.stock_quantity)));addProduct(id,v.id,quantity);close('productPanel');};
    }
    open('productPanel');
  }
  function addProduct(id,variantId=null,quantity=1){
    const p=products.find(x=>x.id===id);if(!p)return;
    const v=(p.product_variants||[]).find(x=>x.id===variantId)||(p.product_variants||[])[0];
    if(!v||Number(v.stock_quantity)<=0)return;
    const maxStock=Number(v.stock_quantity); quantity=Math.max(1,Math.min(Number(quantity)||1,maxStock));
    const key=`${id}:${v.id}`;const found=cart.find(i=>i.key===key);
    if(found)found.quantity=Math.min(found.quantity+quantity,maxStock);else cart.push({key,productId:id,variantId:v.id,name:p.name,variantLabel:`${v.size||'One Size'}${v.color?' — '+v.color:''}`,price:Number(v.price_override??p.price),quantity,maxStock,image_url:p.image_url});
    saveCart();
  }
  function renderCart(){if(!cart.length){$('cartItems').innerHTML='<div class="empty-cart">Your bag is empty.</div>';}else{$('cartItems').innerHTML=cart.map((i,idx)=>`<div class="cart-row"><div class="cart-thumb">${i.image_url?`<img src="${esc(i.image_url)}" alt="">`:''}</div><div><strong>${esc(i.name)}</strong><small>${esc(i.variantLabel)}</small><div class="qty"><button data-cart-dec="${idx}">−</button><span>${i.quantity}</span><button data-cart-inc="${idx}">+</button><button data-cart-del="${idx}" class="remove">Remove</button></div></div><b>${money(i.price*i.quantity)}</b></div>`).join('');document.querySelectorAll('[data-cart-dec]').forEach(b=>b.onclick=()=>changeQty(+b.dataset.cartDec,-1));document.querySelectorAll('[data-cart-inc]').forEach(b=>b.onclick=()=>changeQty(+b.dataset.cartInc,1));document.querySelectorAll('[data-cart-del]').forEach(b=>b.onclick=()=>{cart.splice(+b.dataset.cartDel,1);saveCart();});}$('cartTotal').textContent=money(cart.reduce((s,i)=>s+i.price*i.quantity,0));}
  function changeQty(i,d){const item=cart[i];if(!item)return;item.quantity+=d;if(item.quantity<=0)cart.splice(i,1);else item.quantity=Math.min(item.quantity,item.maxStock);saveCart();}
  $('checkoutBtn').onclick=()=>{if(!cart.length){$('checkoutNote').textContent='Your bag is empty.';return;}$('checkoutForm').classList.toggle('hidden');$('checkoutNote').textContent=$('checkoutForm').classList.contains('hidden')?'Orders are sent to WhatsApp for confirmation.':'Enter your details below and send the order on WhatsApp.';};
  $('whatsappBtn').onclick=async()=>{const number=String(window.WHATSAPP_NUMBER||'YOUR_WHATSAPP_NUMBER').replace(/\D/g,'');const name=$('customerName').value.trim();const phone=$('customerPhone').value.trim();const address=$('customerAddress').value.trim();const msg=$('checkoutMsg');if(!number){msg.textContent='Please add your WhatsApp number in config.js first.';return;}if(!name||!phone||!address){msg.textContent='Please fill in your name, phone and delivery address.';return;}if(!cart.length){msg.textContent='Your bag is empty.';return;}const btn=$('whatsappBtn');btn.disabled=true;btn.textContent='Creating order…';msg.textContent='Saving your order…';try{const {data:orderId,error}=await supabase.rpc('create_whatsapp_order',{p_customer_name:name,p_email:currentUser?.email||null,p_phone:phone,p_address:address,p_items:cart.map(i=>({variant_id:i.variantId,quantity:i.quantity}))});if(error)throw error;const total=cart.reduce((sum,i)=>sum+i.price*i.quantity,0);const lines=['*Drape & Aura – New Order*',`*Order ID:* ${orderId}`,'',`*Customer:* ${name}`,`*Phone:* ${phone}`,`*Address:* ${address}`,'','*Items:*',...cart.map((i,n)=>`${n+1}. ${i.name} — ${i.variantLabel} × ${i.quantity} — ${money(i.price*i.quantity)}`),'',`*Total: ${money(total)}*`,'','Please confirm my order.'];const url=`https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`;cart=[];saveCart();close('cartPanel');$('checkoutForm').classList.add('hidden');msg.textContent='';window.location.href=url;}catch(err){console.error(err);msg.textContent=err?.message||'Could not create the order. Please try again.';}finally{btn.disabled=false;btn.textContent='Order via WhatsApp';}};
  document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentFilter=b.dataset.filter;renderShop();});
  document.querySelectorAll('.cats a[data-category]').forEach(a=>a.onclick=()=>{currentFilter=a.dataset.category;document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x.dataset.filter===currentFilter));setTimeout(renderShop,50);});
  $('searchInput').addEventListener('input',()=>{const q=$('searchInput').value.trim().toLowerCase();const list=q?products.filter(p=>(p.name+' '+p.category+' '+(p.description||'')).toLowerCase().includes(q)):[];$('searchResults').innerHTML=q?(list.length?list.map(p=>`<button class="search-item" data-id="${p.id}"><span>${p.image_url?`<img src="${esc(p.image_url)}" alt="">`:''}</span><strong>${esc(p.name)}</strong><small>${money(p.price)}</small></button>`).join(''):'<p class="muted-note">No products found.</p>'):'<p class="muted-note">Start typing to search the collection.</p>';document.querySelectorAll('.search-item').forEach(b=>b.onclick=()=>{close('searchPanel');showProduct(b.dataset.id);});});
  $('subscribeForm').addEventListener('submit',e=>{e.preventDefault();$('subscribeMsg').textContent='Thank you — you’re on the list.';e.target.reset();});
  const customerCareContent={
    shipping:{title:'Shipping Policy',body:`<p class="muted-note">Orders are shipped to the address provided at checkout. <strong>Placeholder:</strong> replace this text with your final shipping time, delivery areas and shipping charges.</p><p class="muted-note"><strong>Typical example:</strong> Orders may be dispatched within 2–5 business days, with delivery timelines depending on location.</p>`},
    returns:{title:'Return Policy',body:`<p class="muted-note"><strong>Placeholder policy:</strong> eligible items may be returned within a defined number of days if unused and in original condition.</p><p class="muted-note">Replace this section with your actual return window, exclusions, exchange rules and refund process.</p>`},
    faqs:{title:'Frequently Asked Questions',body:`<p><strong>How do I place an order?</strong><br><span class="muted-note">Add products to your bag and use the WhatsApp checkout.</span></p><p><strong>How can I contact you?</strong><br><span class="muted-note">Use the WhatsApp, phone, email or social links in the Contact Us section.</span></p><p><strong>Can I change or cancel an order?</strong><br><span class="muted-note">Contact us as soon as possible. Final rules can be added here later.</span></p>`},
    track:{title:'Track Your Order',body:`<p class="muted-note">For now, please contact us on WhatsApp with your order ID to check the status of your order.</p><p class="muted-note"><strong>Coming later:</strong> online shipment tracking can be connected once courier tracking is added.</p>`}
  };
  document.querySelectorAll('[data-content]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const item=customerCareContent[a.dataset.content];if(!item)return;$('contentDetail').innerHTML=`<p class="eyebrow">CUSTOMER CARE</p><h2>${item.title}</h2>${item.body}`;open('contentPanel');}));

  async function load(){if(!window.SUPABASE_URL||!window.SUPABASE_ANON_KEY)return;const {data,error}=await supabase.from('products').select('*, product_variants(*)').eq('available',true).order('created_at',{ascending:false});if(error){console.error(error);$('shopGrid').innerHTML='<div class="loading-card">Unable to load products right now.</div>';return;}products=data||[];renderShop();renderNew();updateCount();}
  const heroSlides=[
    {eyebrow:'NEW COLLECTION',title:'Timeless Styles<br>for Every You',text:'Elegant clothing, exquisite jewellery,<br>chic bags and more.'},
    {eyebrow:'CURATED FOR YOU',title:'Dress With<br>Confidence',text:'Beautiful pieces that feel as good as they look.'},
    {eyebrow:'JEWELLERY EDIT',title:'A Little Sparkle<br>Goes a Long Way',text:'Delicate details to complete your everyday aura.'},
    {eyebrow:'EVERYDAY ELEGANCE',title:'Find Your<br>Signature Style',text:'Effortless fashion, thoughtfully curated for you.'}
  ];
  let heroIndex=0, heroTimer;
  function showHero(index){heroIndex=(index+heroSlides.length)%heroSlides.length;document.querySelectorAll('.hero-slide').forEach((el,i)=>el.classList.toggle('active',i===heroIndex));document.querySelectorAll('.hero-dot').forEach((el,i)=>el.classList.toggle('active',i===heroIndex));const h=heroSlides[heroIndex];$('heroEyebrow').innerHTML=h.eyebrow;$('heroTitle').innerHTML=h.title;$('heroText').innerHTML=h.text;}
  function startHeroTimer(){clearInterval(heroTimer);heroTimer=setInterval(()=>showHero(heroIndex+1),6000);}
  $('heroPrev').onclick=()=>{showHero(heroIndex-1);startHeroTimer();};
  $('heroNext').onclick=()=>{showHero(heroIndex+1);startHeroTimer();};
  document.querySelectorAll('.hero-dot').forEach(b=>b.onclick=()=>{showHero(Number(b.dataset.slide));startHeroTimer();});
  $('heroCarousel').addEventListener('mouseenter',()=>clearInterval(heroTimer));
  $('heroCarousel').addEventListener('mouseleave',startHeroTimer);
  showHero(0);startHeroTimer();
  $('year').textContent=new Date().getFullYear();renderCart();
  (async()=>{const {data:{session}}=await supabase.auth.getSession();currentUser=session?.user||null;updateAccountLabel(currentUser);})();
  load();
})();
