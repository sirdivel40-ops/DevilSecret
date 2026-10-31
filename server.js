import express from "express";
import crypto from "crypto";
import fs from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const key = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf8"));

initializeApp({ credential: cert(key) });

const db = getFirestore();
const app = express();

app.use(express.json());
app.use(express.static("public"));

app.post("/api/create", async (req, res) => {
  try {
    const { message, expiry } = req.body;

    if (typeof message !== "string" || !message.trim() || message.length > 2000) {
      return res.status(400).json({ error: "Invalid message" });
    }

    const seconds = Number(expiry);

    if (![60, 300, 3600].includes(seconds)) {
      return res.status(400).json({ error: "Invalid expiry" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    await db.collection("secret_messages").doc(token).set({
      message,
      createdAt: Date.now(),
      expiresAt: Date.now() + seconds * 1000
    });

    res.json({
      success: true,
      link: `${req.protocol}://${req.get("host")}/view/${token}`
    });
  } catch (error) {
    console.error("Create error:", error);
    res.status(500).json({ error: "Could not create secret" });
  }
});

app.get("/view/:token", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DEVIL SECRET</title>
<style>
body{margin:0;background:#080808;color:white;font-family:Arial;display:grid;place-items:center;min-height:100vh;padding:20px;box-sizing:border-box}
.card{background:#141414;border:1px solid #a51c32;border-radius:20px;padding:30px 22px;max-width:400px;width:100%;text-align:center;box-sizing:border-box;box-shadow:0 0 30px #a0002040}
h1{color:#ff263f;letter-spacing:4px}
#message{white-space:pre-wrap;overflow-wrap:anywhere;background:#080808;border:1px solid #49202a;padding:20px;border-radius:12px;min-height:50px;text-align:left;line-height:1.5}
</style>
</head>
<body>
<div class="card">
<div style="font-size:50px">😈</div>
<h1>DEVIL SECRET</h1>
<p id="status">Opening secret...</p>
<div id="message" hidden></div>
</div>
<script>
(async()=>{
const status=document.getElementById("status");
try{
const response=await fetch("/api/view/${req.params.token}");
const data=await response.json();
if(!response.ok)throw new Error(data.error);
document.getElementById("message").textContent=data.message;
document.getElementById("message").hidden=false;
status.textContent="Your secret message:";
}catch(e){status.textContent="😈 "+e.message;}
})();
</script>
</body>
</html>`);
});

app.get("/api/view/:token", async (req, res) => {
  try {
    const ref = db.collection("secret_messages").doc(req.params.token);

    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);

      if (!snapshot.exists) {
        return { error: "Message expired or already viewed" };
      }

      const data = snapshot.data();

      if (data.expiresAt <= Date.now()) {
        transaction.delete(ref);
        return { error: "Message expired or already viewed" };
      }

      transaction.delete(ref);
      return { message: data.message };
    });

    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error("View error:", error);
    res.status(500).json({ error: "Could not open secret" });
  }
});

app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("DEVIL SECRET FIRESTORE API READY 😈");
});
