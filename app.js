// 引入 Express 和 mysql2 模組
const express = require('express');
const mysql = require('mysql2/promise'); // 使用 promise 版本，讓資料庫操作更簡潔
const app = express();
const port = 3000;

// 設置一個新的變數，用來處理跨域請求 (CORS)。
// 這在前端網頁和後端伺服器運行在不同地址時非常重要！
// 我們稍後會安裝 CORS 套件
const cors = require('cors'); 
app.use(cors()); // 啟用 CORS

// 設置 Express 應用程式使用 JSON 格式來解析請求的 body (例如前端送來的表單資料)
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); // 也能處理 URL 編碼的表單資料


// 配置資料庫連接資訊
const dbConfig = {
    host: 'localhost',   // 資料庫主機地址，通常是你的電腦 (localhost)
    user: 'root',        // 資料庫使用者名稱 (預設是 root)
    password: '12345678', // !!! 請把這裡替換成你設定的 MySQL root 密碼 !!!
    database: 'my_web_db' // 你在 MySQL Workbench 中建立的資料庫名稱
};

let connection; // 宣告一個變數來存放資料庫連接

// 函數：嘗試連接到資料庫
async function connectToDatabase() {
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('成功連接到 MySQL 資料庫！');
    } catch (err) {
        console.error('連接資料庫失敗:', err);
        // 如果連接失敗，可以設定一個重試機制或讓應用程式退出
        setTimeout(connectToDatabase, 5000); // 5 秒後重試連接
    }
}

// 在伺服器啟動時就嘗試連接資料庫
connectToDatabase();


// --- 路由設定 ---

// 根路徑路由
app.get('/', (req, res) => {
    res.send('哈囉！這是我的 Express 伺服器，已連接資料庫！');
});

// 獲取所有留言的路由 (GET 請求)
app.get('/messages', async (req, res) => {
    if (!connection) {
        return res.status(500).send('資料庫未連接。');
    }
    try {
        // 從 messages 表格中選取所有留言
        const [rows] = await connection.execute('SELECT id, name, content FROM messages ORDER BY id DESC');
        res.json(rows); // 將查詢結果以 JSON 格式發送給前端
    } catch (err) {
        console.error('查詢留言失敗:', err);
        res.status(500).send('查詢留言失敗。');
    }
});

// 新增留言的路由 (POST 請求)
app.post('/messages', async (req, res) => {
    if (!connection) {
        return res.status(500).send('資料庫未連接。');
    }
    const { name, content } = req.body; // 從請求的 body 中獲取 name 和 content

    // 檢查資料是否完整
    if (!name || !content) {
        return res.status(400).send('姓名和留言內容不能為空。');
    }

    try {
        // 將留言插入到 messages 表格中
        const [result] = await connection.execute(
            'INSERT INTO messages (name, content) VALUES (?, ?)',
            [name, content] // 使用 ? 作為佔位符，防止 SQL 注入攻擊，更安全
        );
        res.status(201).send({ id: result.insertId, name, content, message: '留言新增成功！' }); // 返回新增的資料 ID 和成功訊息
    } catch (err) {
        console.error('新增留言失敗:', err);
        res.status(500).send('新增留言失敗。');
    }
});


// 啟動伺服器並監聽指定的連接埠
app.listen(port, () => {
    console.log(`伺服器已啟動，正在監聽 http://localhost:${port}`);
    console.log(`你可以訪問 http://localhost:${port}`);
    console.log(`API 獲取留言: http://localhost:${port}/messages`);
    console.log(`前端網頁需要連接到此伺服器來送出留言。`);
});