import { Userid, UserName } from "@/interfaces/zustand_states";
import { create } from "zustand";

const useUserId = create<Userid>((set) => ({
  userid: "",
  setUserId: (newUserid: string) => set({ userid: newUserid }),
}));

const useUserName = create<UserName>((set) => ({
  username: "",
  setUsername: (newUsername: string) => set({ username: newUsername }),
}));

export { useUserId, useUserName };
