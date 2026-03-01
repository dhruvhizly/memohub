import { Userid } from "@/interfaces/zustand_state_types";
import { create } from "zustand";

const useUserId = create<Userid>((set) => ({
  userid: "",
  setUserId: (newUserid: string) => set({ userid: newUserid }),
}));

export { useUserId };
