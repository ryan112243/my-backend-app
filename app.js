const express = require('express');
const cors = require('cors');
const pg = require('pg'); // 引入 PostgreSQL 的套件
require('dotenv').config(); // 用來載入 .env 檔案中的環境變數

const app = express();
const port = process.env.PORT || 3000; // 從環境變數獲取埠號，如果沒有則預設為 3000

// 使用 CORS 中介軟體，允許所有來源訪問
app.use(cors());
// 解析 JSON 格式的請求體
app.use(express.json());

// --- PostgreSQL 資料庫配置 (用於部署到 Render) ---
const pgConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false // 允許自簽名證書，Render 預設為 true
    }
};

let pgClient; // 用來儲存 PostgreSQL 連線實例

async function connectToPostgres() {
    try {
        // 使用 pg.Client 建立單一連線
        pgClient = new pg.Client(pgConfig);
        await pgClient.connect();
        console.log('成功連接到 PostgreSQL 資料庫！');

        // 檢查 messages 表格是否存在，如果不存在則建立
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await pgClient.query(createTableQuery);
        console.log('messages 表格已準備好或已存在。');

    } catch (error) {
        console.error('連接 PostgreSQL 資料庫失敗:', error);
        // 如果連接失敗，嘗試在一段時間後重新連接
        setTimeout(connectToPostgres, 5000); // 5 秒後重試
    }
}

// 在應用程式啟動時連接到 PostgreSQL
connectToPostgres();

// --- API 路由 ---

// 獲取所有留言
app.get('/messages', async (req, res) => {
    try {
        const result = await pgClient.query('SELECT id, name, content, created_at FROM messages ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('獲取留言失敗:', error);
        res.status(500).json({ message: '獲取留言失敗' });
    }
});

// 新增留言
app.post('/messages', async (req, res) => {
    const { name, content } = req.body;
    if (!name || !content) {
        return res.status(400).json({ message: '姓名和內容為必填項。' });
    }

    try {
        const query = 'INSERT INTO messages (name, content) VALUES ($1, $2) RETURNING *';
        const values = [name, content];
        const result = await pgClient.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('新增留言失敗:', error);
        res.status(500).json({ message: '新增留言失敗' });
    }
});


// 簡單的首頁路由 (可選，但對測試部署有幫助)
app.get('/', (req, res) => {
    res.send('後端伺服器已啟動並運行中！');
});

// 啟動伺服器
app.listen(port, () => {
    console.log(`伺服器已啟動，正在監聽 http://localhost:${port}`);
    console.log(`API 獲取留言: http://localhost:${port}/messages`);
    console.log('前端網頁需要連接到此伺服器來送出留言。');
});