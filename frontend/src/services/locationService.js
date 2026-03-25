
import api from "./api";

const locationService = {
    getAll: async () => {
        const response = await api.get("/location/all");
        return response.data;
    },
    
    getStates: async () => {
        const response = await api.get("/location/states");
        return response.data;
    },
    
    getLGAs: async (stateId) => {
        const url = stateId ? `/location/lgas?stateId=${stateId}` : "/location/lgas";
        const response = await api.get(url);
        return response.data;
    },
    
    getFeeders: async () => {
        const response = await api.get("/location/feeders");
        return response.data;
    }
};

export default locationService;
