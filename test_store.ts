import { loadUsers, saveUsers, registerUser } from "./src/lib/user-store";

async function testStore() {
    console.log("Loading users...");
    const users = await loadUsers();
    console.log("Loaded:", users);

    console.log("Registering test user...");
    await registerUser("test@test.com", "Test User");

    const users2 = await loadUsers();
    console.log("Loaded after reg:", users2);
}

testStore().catch(console.error);
