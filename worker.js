export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS")
      return new Response(null, { headers: cors });

    const json = (data, status = 200) =>
      Response.json(data, { status, headers: cors });

    if (!env.DB) return json({ error: "D1 database not connected" }, 500);

    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          username TEXT PRIMARY KEY,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT,
          protocol TEXT DEFAULT 'VLESS',
          config TEXT,
          expires_at TEXT,
          status TEXT DEFAULT 'active',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      if (url.pathname === "/api/login" && request.method === "POST") {
        const body = await request.json();

        if (!env.ADMIN_PASSWORD)
          return json({ error: "ADMIN_PASSWORD not configured" }, 500);

        if (body.password !== env.ADMIN_PASSWORD)
          return json({ error: "رمز عبور اشتباه است" }, 401);

        return json({ success: true, message: "ورود موفق" });
      }

      if (url.pathname === "/api/status") {
        return json({
          panel: "REZA HOSSEINI",
          database: "connected",
          status: "online"
        });
      }

      if (url.pathname === "/api/users" && request.method === "GET") {
        const result = await env.DB.prepare(
          "SELECT * FROM users ORDER BY created_at DESC"
        ).all();

        return json(result.results);
      }

      if (url.pathname === "/api/users" && request.method === "POST") {
        const body = await request.json();

        if (!body.username)
          return json({ error: "نام کاربر الزامی است" }, 400);

        await env.DB.prepare(
          "INSERT INTO users (username) VALUES (?)"
        ).bind(body.username).run();

        return json({ success: true });
      }

      if (url.pathname === "/api/subscriptions" && request.method === "GET") {
        const result = await env.DB.prepare(
          "SELECT * FROM subscriptions ORDER BY id DESC"
        ).all();

        return json(result.results);
      }

      if (url.pathname === "/api/subscriptions" && request.method === "POST") {
        const body = await request.json();

        if (!body.user_id)
          return json({ error: "شناسه کاربر الزامی است" }, 400);

        await env.DB.prepare(`
          INSERT INTO subscriptions
          (user_id, protocol, config, expires_at)
          VALUES (?, ?, ?, ?)
        `).bind(
          body.user_id,
          body.protocol || "VLESS",
          body.config || "",
          body.expires_at || null
        ).run();

        return json({ success: true });
      }

      if (url.pathname === "/") {
        return new Response(`
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>REZA HOSSEINI PANEL</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#101827;color:white;font-family:tahoma;padding:20px}
.box{max-width:650px;margin:35px auto;background:#1c293b;padding:25px;border-radius:18px}
h2{color:#35d6a0;text-align:center}
input,button{width:100%;padding:14px;margin:9px 0;border:0;border-radius:9px}
input{background:#29394f;color:white}
button{background:#16a77b;color:white;font-weight:bold}
.card{background:#29394f;padding:15px;margin:10px 0;border-radius:10px}
.hidden{display:none}
</style>
</head>
<body>
<div class="box">
<h2>REZA HOSSEINI</h2>
<p style="text-align:center">پنل مدیریت اختصاصی</p>

<div id="login">
<input id="password" type="password" placeholder="رمز عبور مدیر">
<button onclick="login()">ورود به سیستم</button>
</div>

<div id="panel" class="hidden">
<h3>داشبورد مدیریت</h3>
<div class="card">وضعیت سیستم: آنلاین</div>
<button onclick="loadUsers()">مشاهده کاربران</button>
<button onclick="loadSubs()">مشاهده اشتراک‌ها</button>

<h3>افزودن کاربر</h3>
<input id="username" placeholder="نام کاربری">
<button onclick="addUser()">ثبت کاربر</button>

<h3>افزودن اشتراک</h3>
<input id="uid" placeholder="شناسه کاربر">
<input id="protocol" placeholder="پروتکل (VLESS)">
<input id="config" placeholder="کانفیگ">
<input id="expiry" type="date">
<button onclick="addSub()">ثبت اشتراک</button>

<div id="result"></div>
</div>
</div>

<script>
async function api(path,body){
 const options={method:body?"POST":"GET",
 headers:{"Content-Type":"application/json"}};
 if(body) options.body=JSON.stringify(body);
 const r=await fetch(path,options);
 return r.json();
}

async function login(){
 const r=await api("/api/login",{password:document.getElementById("password").value});
 if(r.success){
 document.getElementById("login").classList.add("hidden");
 document.getElementById("panel").classList.remove("hidden");
 }else alert(r.error);
}

async function addUser(){
 try{
 const r=await api("/api/users",{username:document.getElementById("username").value});
 alert(r.success?"کاربر ثبت شد":r.error);
 }catch(e){alert("خطا در ثبت کاربر")}
}

async function addSub(){
 try{
 const r=await api("/api/subscriptions",{
 user_id:document.getElementById("uid").value,
 protocol:document.getElementById("protocol").value,
 config:document.getElementById("config").value,
 expires_at:document.getElementById("expiry").value
 });
 alert(r.success?"اشتراک ثبت شد":r.error);
 }catch(e){alert("خطا در ثبت اشتراک")}
}

async function loadUsers(){
 const r=await api("/api/users");
 document.getElementById("result").innerHTML=
 "<h3>کاربران</h3>"+r.map(x=>'<div class="card">'+x.username+'</div>').join("");
}

async function loadSubs(){
 const r=await api("/api/subscriptions");
 document.getElementById("result").innerHTML=
 "<h3>اشتراک‌ها</h3>"+r.map(x=>'<div class="card">'+x.user_id+" | "+x.protocol+" | "+(x.expires_at||"بدون تاریخ")+'</div>').join("");
}
</script>
</body>
</html>
        `, {
          headers: { "Content-Type": "text/html; charset=UTF-8" }
        });
      }

      return json({ error: "Not Found" }, 404);

    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }
};
