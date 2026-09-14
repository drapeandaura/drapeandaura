console.log("Drape & Aura Supabase URL:", window.SUPABASE_URL);
console.log("Drape & Aura Supabase connected:", !!window.SUPABASE_URL && !!window.SUPABASE_ANON_KEY);
document.addEventListener("DOMContentLoaded",()=>{document.getElementById("year").textContent=new Date().getFullYear();let n=0;document.querySelectorAll(".add").forEach(b=>b.onclick=()=>{n++;document.getElementById("count").textContent=n;b.textContent="✓  Added to Cart";setTimeout(()=>b.textContent="♡  Add to Cart",1000)})});
