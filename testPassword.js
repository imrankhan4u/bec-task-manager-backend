const bcrypt = require("bcryptjs");

async function checkPassword() {
    const password = "Admin@123";
    const storedHash = "$2b$10$KIAozCqwQrglL4GklcWS3uP1pFhufENsEmi8GnfA02eNCK1E6U31q";

    const isMatch = await bcrypt.compare(password, storedHash);
    console.log("Password Match:", isMatch);
}

checkPassword();
