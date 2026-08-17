import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(async () => {
    const UserModel = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
    const users = await UserModel.find({}).limit(5).lean();
    console.log(users.map(u => ({ id: u._id, role: u.role, companyId: u.companyId })));
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
