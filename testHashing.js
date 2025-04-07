const bcrypt = require("bcryptjs");

async function testHashing() {
    const password = "Admin@123";
    const saltRounds = 10;

    // Generate hash
    const hash = await bcrypt.hash(password, saltRounds);
    console.log("Test Hash:", hash);

    // Compare to itself
    const match = await bcrypt.compare(password, hash);
    console.log("Match (should be true):", match);
}

testHashing();
