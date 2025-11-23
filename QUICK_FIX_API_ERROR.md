# 🔧 Quick Fix for "Failed to get calories" Error

## ❗ **Issue**: 
The food/exercise AI analysis is failing because the OpenAI API key is not configured.

## ✅ **Solution**:

### **1. Get OpenAI API Key**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the API key (starts with `sk-`)

### **2. Set Up Environment File**
1. In your project root, create `.env.local` file:
   ```bash
   touch .env.local
   ```

2. Add your OpenAI API key:
   ```env
   OPENAI_API_KEY=sk-your_actual_openai_api_key_here
   ```

### **3. Restart Development Server**
```bash
npm run dev
```

## 🧪 **Test the Fix**:
1. Try adding food: "2 eggs and banana"
2. Try adding exercise: "ran 3km in 20 minutes"
3. Should now work with AI analysis!

## 💡 **What Happens Now**:
- ✅ **With API Key**: Real AI analysis for accurate calories
- 🔄 **Without API Key**: Smart fallback estimation system
- 📊 **Both Cases**: App works, just with different accuracy levels

## 📋 **Current Status**:
The app has been updated with:
- **Better error handling** - no more crashes
- **Smart fallback system** - works even without API key
- **Clear user feedback** - shows if AI or estimated
- **Detailed logging** - easier debugging

The error is now fixed and the app will gracefully handle missing API keys! 🎉