import PocketBase from "pocketbase";

const pb = new PocketBase(process.env.NEXT_PUBLIC_DATABASE_IP_URL);

pb.autoCancellation(false);

export default pb;
