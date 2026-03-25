# Setup Guide for Nexus Chat Backend

## 1. Database Setup ✅

Your database is already configured:
- **Database Name**: `chatdb`
- **Username**: `postgres`
- **Password**: `Chir@gM12`
- **URL**: `jdbc:postgresql://localhost:5432/chatdb`

### Create the Database

Run this SQL command in PostgreSQL:

```sql
CREATE DATABASE chatdb;
```

Or use psql command line:
```bash
psql -U postgres -c "CREATE DATABASE chatdb;"
```

---

## 2. Google OAuth2 Credentials (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET)

### Step-by-Step Guide:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project** (or select existing)
   - Click on the project dropdown at the top
   - Click "New Project"
   - Name it (e.g., "Nexus Chat")
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" or "Google Identity"
   - Click on it and press "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If prompted, configure the OAuth consent screen first:
     - User Type: External (for testing) or Internal (for Google Workspace)
     - App name: "Nexus Chat"
     - User support email: Your email
     - Developer contact: Your email
     - Click "Save and Continue"
     - Add scopes: `openid`, `profile`, `email`
     - Click "Save and Continue"
     - Add test users (if external)
     - Click "Save and Continue"

5. **Create OAuth Client ID**
   - Application type: **Web application**
   - Name: "Nexus Chat Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:5000`
     - `http://localhost:3000` (if using React dev server)
   - Authorized redirect URIs:
     - `http://localhost:5000/api/auth/oauth2/callback/google`
     - `http://localhost:5000/login/oauth2/code/google` (Spring Boot default)
   - Click "Create"

6. **Copy Your Credentials**
   - You'll see a popup with:
     - **Client ID** (copy this → `GOOGLE_CLIENT_ID`)
     - **Client Secret** (copy this → `GOOGLE_CLIENT_SECRET`)

7. **Add to application.yml**
   ```yaml
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   ```

   Or set as environment variables:
   ```bash
   export GOOGLE_CLIENT_ID="your-client-id"
   export GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

---

## 3. Gmail/Email Configuration (MAIL_USERNAME & MAIL_PASSWORD)

### For Gmail (Recommended):

1. **Enable 2-Factor Authentication**
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification" if not already enabled

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Or: Google Account > Security > 2-Step Verification > App passwords
   - Select app: "Mail"
   - Select device: "Other (Custom name)"
   - Enter name: "Nexus Chat Backend"
   - Click "Generate"
   - **Copy the 16-character password** (this is your `MAIL_PASSWORD`)

3. **Add to application.yml**
   ```yaml
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=your-16-char-app-password
   ```

   Or set as environment variables:
   ```bash
   export MAIL_USERNAME="your-email@gmail.com"
   export MAIL_PASSWORD="xxxx xxxx xxxx xxxx"  # Remove spaces
   ```

### For Other Email Providers:

**Outlook/Hotmail:**
```yaml
spring:
  mail:
    host: smtp-mail.outlook.com
    port: 587
    username: your-email@outlook.com
    password: your-password
```

**Yahoo:**
```yaml
spring:
  mail:
    host: smtp.mail.yahoo.com
    port: 587
    username: your-email@yahoo.com
    password: your-app-password
```

**Custom SMTP:**
```yaml
spring:
  mail:
    host: smtp.yourdomain.com
    port: 587  # or 465 for SSL
    username: your-email@yourdomain.com
    password: your-password
```

---

## 4. JWT Secret Key

Generate a secure JWT secret (minimum 32 characters):

### Option 1: Online Generator
- Visit: https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
- Select: 256-bit
- Copy the key

### Option 2: Command Line
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Option 3: Use a Long Random String
Any random string of at least 32 characters works.

Add to `application.yml`:
```yaml
jwt:
  secret: ${JWT_SECRET:your-generated-secret-key-here-minimum-32-characters}
```

Or set as environment variable:
```bash
export JWT_SECRET="your-generated-secret-key-here"
```

---

## Quick Setup Checklist

- [x] Database configured (`chatdb` with password `Chir@gM12`)
- [ ] Create `chatdb` database in PostgreSQL
- [ ] Get Google OAuth2 credentials
- [ ] Add Google credentials to `application.yml` or environment variables
- [ ] (Optional) Configure email settings
- [ ] Generate JWT secret key
- [ ] Add JWT secret to `application.yml` or environment variables

---

## Environment Variables Summary

Create a `.env` file (or set in your system):

```bash
# Database
DATABASE_URL=jdbc:postgresql://localhost:5432/chatdb
DB_USERNAME=postgres
DB_PASSWORD=Chir@gM12

# JWT
JWT_SECRET=your-generated-secret-key-minimum-32-characters

# Google OAuth2
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Email (Optional)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Server
PORT=5000
SPRING_PROFILES_ACTIVE=dev
```

---

## Testing Your Setup

1. **Test Database Connection:**
   ```bash
   psql -U postgres -d chatdb -c "SELECT version();"
   ```

2. **Run Spring Boot:**
   ```bash
   cd server
   mvn spring-boot:run
   ```

3. **Check Health:**
   - Visit: http://localhost:5000/actuator/health

4. **Test OAuth2:**
   - Visit: http://localhost:5000/api/auth/oauth2/authorization/google

---

## Troubleshooting

### Database Connection Issues:
- Make sure PostgreSQL is running
- Check if database `chatdb` exists
- Verify username/password

### OAuth2 Issues:
- Check redirect URI matches exactly
- Ensure OAuth consent screen is configured
- Verify API is enabled

### Email Issues:
- Use App Password, not regular password
- Check 2FA is enabled
- Verify SMTP settings
