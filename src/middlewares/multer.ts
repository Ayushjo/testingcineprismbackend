import multer from "multer";


const storage = multer.memoryStorage();

const uploadFile = multer({
    storage
})

export default uploadFile