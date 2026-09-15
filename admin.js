const { createClient } = window.supabase;
const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
let editingProduct = null;

function show(id, visible=true){ $(id).classList.toggle('hidden', !visible); }
function escapeHtml(value=''){ return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function money(v){ return `₹${Number(v || 0).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2})}`; }

async function isAdmin(){
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

function isRecoveryUrl(){
  const hash = new URLSearchParams(window.location.hash.replace(/^#/,''));
  const query = new URLSearchParams(window.location.search);
  return hash.get('type') === 'recovery' || query.get('type') === 'recovery';
}

function showLogin(){ show('adminView',false); show('resetView',false); show('loginView',true); }
function showReset(){ show('loginView',false); show('adminView',false); show('resetView',true); }

async function boot(){
  if(!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY){
    $('loginError').textContent='Supabase configuration is missing.';
    return;
  }
  const { data:{session} } = await supabase.auth.getSession();
  if(isRecoveryUrl()){
    showReset();
  } else if(session) {
    await enterAdmin(session);
  }
  supabase.auth.onAuthStateChange(async (event, session) => {
    if(event === 'PASSWORD_RECOVERY'){ showReset(); return; }
    if(session && !isRecoveryUrl()) await enterAdmin(session);
    else if(!session) showLogin();
  });
}

async function enterAdmin(session){
  const admin = await isAdmin();
  if(!admin){
    await supabase.auth.signOut();
    $('loginError').textContent='This account is not authorised to access the admin area.';
    show('loginView',true); show('adminView',false); return;
  }
  $('adminEmail').textContent=session.user.email || '';
  show('loginView',false); show('adminView',true);
  await loadProducts();
}

$('loginForm').addEventListener('submit', async e=>{
  e.preventDefault(); $('loginError').textContent='';
  const { error } = await supabase.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});
  if(error) $('loginError').textContent=error.message;
});

$('forgotPasswordBtn').addEventListener('click', async ()=>{
  $('loginError').textContent='';
  const email=$('loginEmail').value.trim();
  if(!email){ $('loginError').textContent='Enter the admin email address first, then click “Forgot password?”.'; return; }
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email,{redirectTo});
  if(error) $('loginError').textContent=error.message;
  else $('loginError').textContent='Password recovery email sent. Check your inbox.';
});

$('resetForm').addEventListener('submit', async e=>{
  e.preventDefault(); $('resetError').textContent='';
  const password=$('newPassword').value;
  const confirm=$('confirmPassword').value;
  if(password!==confirm){ $('resetError').textContent='The passwords do not match.'; return; }
  $('resetPasswordBtn').disabled=true; $('resetPasswordBtn').textContent='Updating…';
  const { error } = await supabase.auth.updateUser({password});
  if(error){
    $('resetError').textContent=error.message;
  }else{
    $('newPassword').value=''; $('confirmPassword').value='';
    history.replaceState({},document.title,window.location.pathname);
    await supabase.auth.signOut();
    $('loginError').textContent='Password updated. You can now sign in.';
    showLogin();
  }
  $('resetPasswordBtn').disabled=false; $('resetPasswordBtn').textContent='Update Password';
});

$('logoutBtn').addEventListener('click',()=>supabase.auth.signOut());

document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active')); btn.classList.add('active');
  document.querySelectorAll('.admin-section').forEach(s=>s.classList.add('hidden')); $(btn.dataset.section).classList.remove('hidden');
}));

function resetForm(){
  editingProduct=null; $('productId').value=''; $('formEyebrow').textContent='PRODUCT'; $('formTitle').textContent='Add Product'; $('productForm').reset(); $('productAvailable').checked=true; $('productNewArrival').checked=false; $('variants').innerHTML=''; addVariant(); $('formError').textContent='';
}
function openModal(product=null){
  resetForm();
  if(product){
    editingProduct=product; $('formEyebrow').textContent='EDIT PRODUCT'; $('formTitle').textContent='Edit Product'; $('productId').value=product.id; $('productName').value=product.name||''; $('productCategory').value=product.category||'Clothing'; $('productPrice').value=product.price??''; $('productImage').value=product.image_url||''; $('productDescription').value=product.description||''; $('productAvailable').checked=product.available!==false; $('productNewArrival').checked=product.new_arrival===true; $('variants').innerHTML=''; (product.product_variants||[]).forEach(addVariant); if(!(product.product_variants||[]).length)addVariant();
  }
  show('productModal',true); $('productModal').setAttribute('aria-hidden','false');
}
function closeModal(){show('productModal',false); $('productModal').setAttribute('aria-hidden','true');}
$('newProductBtn').addEventListener('click',()=>openModal()); $('closeModal').addEventListener('click',closeModal); $('cancelBtn').addEventListener('click',closeModal);
$('productModal').addEventListener('click',e=>{if(e.target===$('productModal'))closeModal()});

function addVariant(v={}){
  const row=document.createElement('div'); row.className='variant-row';
  row.innerHTML=`<label>SKU<input class="v-sku" value="${escapeHtml(v.sku||'')}" placeholder="Optional"></label><label>Size<input class="v-size" value="${escapeHtml(v.size||'One Size')}" required placeholder="M"></label><label>Colour<input class="v-color" value="${escapeHtml(v.color||'')}" placeholder="Blue"></label><label>Stock<input class="v-stock" type="number" min="0" value="${Number.isFinite(v.stock_quantity)?v.stock_quantity:0}" required></label><button type="button" class="remove-variant" aria-label="Remove variant">×</button>`;
  row.querySelector('.remove-variant').addEventListener('click',()=>row.remove()); $('variants').appendChild(row);
}
$('addVariantBtn').addEventListener('click',()=>addVariant());

function getVariants(){return [...document.querySelectorAll('.variant-row')].map(r=>({sku:r.querySelector('.v-sku').value.trim()||null,size:r.querySelector('.v-size').value.trim()||'One Size',color:r.querySelector('.v-color').value.trim()||null,stock_quantity:Number(r.querySelector('.v-stock').value||0),available:Number(r.querySelector('.v-stock').value||0)>0}));}

$('productForm').addEventListener('submit',async e=>{
  e.preventDefault(); $('formError').textContent=''; const variants=getVariants();
  if(!variants.length){$('formError').textContent='Add at least one size/colour variant.';return;}
  const product={name:$('productName').value.trim(),category:$('productCategory').value,price:Number($('productPrice').value),image_url:$('productImage').value.trim()||null,description:$('productDescription').value.trim()||null,available:$('productAvailable').checked,new_arrival:$('productNewArrival').checked};
  if(!product.name || Number.isNaN(product.price)){ $('formError').textContent='Please enter a product name and valid price.'; return; }
  $('saveProductBtn').disabled=true; $('saveProductBtn').textContent='Saving…';
  try{
    let productId;
    if(editingProduct){
      const {error}=await supabase.from('products').update(product).eq('id',editingProduct.id); if(error)throw error; productId=editingProduct.id;
      const {error:delError}=await supabase.from('product_variants').delete().eq('product_id',productId); if(delError)throw delError;
    }else{
      const {data,error}=await supabase.from('products').insert(product).select('id').single(); if(error)throw error; productId=data.id;
    }
    const rows=variants.map(v=>({...v,product_id:productId})); const {error:varError}=await supabase.from('product_variants').insert(rows); if(varError)throw varError;
    closeModal(); await loadProducts(); showMessage(editingProduct?'Product updated successfully.':'Product added successfully.');
  }catch(err){ $('formError').textContent=err.message || 'Could not save product.'; }
  finally{$('saveProductBtn').disabled=false;$('saveProductBtn').textContent='Save Product';}
});

async function loadProducts(){
  $('productList').innerHTML='<div class="loading">Loading products…</div>';
  const {data,error}=await supabase.from('products').select('*, product_variants(*)').order('created_at',{ascending:false});
  if(error){$('productList').innerHTML=`<div class="empty-state">Could not load products.<br><small>${escapeHtml(error.message)}</small></div>`;return;}
  if(!data.length){$('productList').innerHTML='<div class="empty-state">No products yet. Click <strong>+ Add Product</strong> to create your first product.</div>';return;}
  $('productList').innerHTML=data.map(p=>{
    const total=(p.product_variants||[]).reduce((s,v)=>s+Number(v.stock_quantity||0),0); const variantCount=(p.product_variants||[]).length;
    const badges=`<div class="badges">${p.new_arrival?'<span class="badge new">New Arrival</span>':''}${!p.available||total===0?'<span class="badge off">Out of Stock</span>':''}</div>`;
    const style=p.image_url?`style="background-image:url('${escapeHtml(p.image_url)}')"`:'';
    return `<div class="product-row"><div class="thumb" ${style}>${p.image_url?'':'Image'}</div><div class="product-info"><h3>${escapeHtml(p.name)}</h3><div class="meta"><span>${escapeHtml(p.category)}</span><span>${money(p.price)}</span><span>${variantCount} variant${variantCount===1?'':'s'}</span><span>${total} in stock</span></div>${badges}</div><div class="row-actions"><button class="small-btn edit" data-id="${p.id}">Edit</button><button class="small-btn danger delete" data-id="${p.id}">Delete</button></div></div>`;
  }).join('');
  document.querySelectorAll('.edit').forEach(b=>b.addEventListener('click',()=>openModal(data.find(p=>p.id===b.dataset.id))));
  document.querySelectorAll('.delete').forEach(b=>b.addEventListener('click',()=>deleteProduct(b.dataset.id,data.find(p=>p.id===b.dataset.id)?.name||'this product')));
}
async function deleteProduct(id,name){
  if(!confirm(`Delete “${name}”? This will also delete its variants.`))return;
  const {error}=await supabase.from('products').delete().eq('id',id); if(error){alert(error.message);return;} await loadProducts(); showMessage('Product deleted.');
}
function showMessage(text){$('productMessage').textContent=text;show('productMessage',true);setTimeout(()=>show('productMessage',false),3000)}

boot();
