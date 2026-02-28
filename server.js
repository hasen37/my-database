const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json({ limit: '50mb' })); // للسماح برفع صور البوسترات الكبيرة
app.use(cors());
app.use(express.static('public')); // لتشغيل ملفات الموقع من مجلد public

const mongoURI = process.env.MONGO_URI; 
mongoose.connect(mongoURI).then(() => console.log("Connected to MongoDB"));

const Drama = mongoose.model('Drama', new mongoose.Schema({
    id: Number, name: String, category: String, country: String, 
    year: String, img: String, desc: String, eps: Array
}));

// جلب البيانات للموقع
app.get('/api/series', async (req, res) => {
    const data = await Drama.find().sort({ _id: -1 });
    res.json(data);
});

// إضافة من لوحة التحكم
app.post('/api/series', async (req, res) => {
    const lastItem = await Drama.findOne().sort({ id: -1 });
    const newId = lastItem ? lastItem.id + 1 : 1;
    const newDrama = new Drama({ ...req.body, id: newId });
    await newDrama.save();
    res.status(201).json(newDrama);
});

// حذف مسلسل
app.delete('/api/delete/series/:id', async (req, res) => {
    await Drama.deleteOne({ id: req.params.id });
    res.json({ message: "Deleted" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
