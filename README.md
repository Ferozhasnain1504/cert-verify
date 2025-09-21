# Certificate Verification Prototype

This is a **hackathon prototype** for a **Blockchain-based Certificate Authentication System**.  
It allows users to **upload certificates or verify by ID** and instantly check whether a certificate is **genuine or forged**.

> ⚠️ Note: This prototype uses **MongoDB** to store certificate hashes for rapid demo purposes.  
> The blockchain layer is not implemented yet, but the flow simulates end-to-end verification.

---

## Features

- Upload a certificate (PDF) and store its SHA-256 hash in the database.
- Verify a certificate by uploading the same file.
- Verify a certificate by entering its unique ID.
- Clear **Genuine / Forged** indication with metadata.

---

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** MongoDB (Atlas free tier recommended)
- **File Handling:** Multer
- **Hashing:** Crypto (SHA-256)
- **Frontend Demo:** Simple HTML + fetch API
- **CORS:** Enabled for cross-origin requests

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Ferozhasnain1504/cert-verify
cd backend
```
### 2. Install dependencies
```bash
npm install
```
### 3. Create a .env file
```ini
PORT=5000
MONGODB_URI=your_mongodb_connection_string_here
```
#### Example MongoDB URI (replace ```<username>```, ```<password>```, ```<dbname>```):
```php-template
mongodb+srv://<username>:<password>@cluster0.abcdx.mongodb.net/<dbname>?retryWrites=true&w=majority
```
### 4. Start the backend server
```bash
npm run dev
```
### 5. Open the demo frontend
Serve ```verify-demo.html``` using a static server
```bash
npx serve .
```
Open the URL shown in the terminal (usually ```http://localhost:5000```) in your browser.

----

### How to Use

## Verify by File

1. Select a certificate PDF.
2. Click Verify Certificate.
3. ✅ Genuine Certificate if stored, ❌ Forged Certificate if not.

## Verify by ID

1. Enter a certificate ID.
2. Click Verify by ID.
3. ✅ Genuine Certificate if the ID exists, ❌ Forged Certificate if it doesn’t.

---

## API Endpoints

| Method | Endpoint        | Description                                                                |
| ------ | --------------- | -------------------------------------------------------------------------- |
| GET    | `/api/health`   | Server health check                                                        |
| POST   | `/api/upload`   | Upload a certificate (fields: `name`, `issuer`, `date`, `certificateFile`) |
| POST   | `/api/verify`   | Verify a certificate by file (`certificateFile`) or JSON `{ id }`          |
| GET    | `/api/cert/:id` | Get certificate metadata by ID                                             |

---
### Notes

 -The prototype mocks blockchain functionality for quick demo.
 - To implement real blockchain storage:
 - Use Ethereum / Polygon / Truffle / Web3.js.
 - Store certificate hash on-chain.
 - Verify by querying the blockchain.

---

### License

This project is for educational/demo purposes and hackathon use.
