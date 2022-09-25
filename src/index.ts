import Gateway from "./gateway";
import dotenv from "dotenv"

dotenv.config();

const token: string | undefined = process.env.TOKEN;
if (token == undefined) {
    console.error("Token is missing");

    process.exit();
}

const gateway = new Gateway(token, true);

// gateway.onopen(() => {
//     console.log("Gateway opened!");
// });
// gateway.on("MESSAGE_CREATE", async (d, s, t) => {
//     const { content, author, member } = d;

//     if (!member) { //DM
//         console.log(`<${author.username}>: ${content}`);
//     }
//     else {
//         console.log(`<${member.nick}>: ${content}`);
//     }
// });