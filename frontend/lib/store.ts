import { Userid } from "@/interfaces/zustand_states";
import { create } from "zustand";

const useUserId = create<Userid>((set) => ({
  userid: "",
  setUserId: (newUserid: string) => set({ userid: newUserid }),
}));

export { useUserId };
