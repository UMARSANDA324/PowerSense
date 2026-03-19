
import api from "./api";

const locationService = {
    getAll: async () => {
        const response = await api.get("/location/all");
        return response.data;
    },
    
    // We can add more specific fetchers if needed
    getStates: async () => {
        const response = await api.get("/location/all");
        return response.data.states;
    },
    
    getLGAs: async (stateId) => {
        const response = await api.get("/location/all");
        if (stateId) {
            return response.data.lgas.filter(lga => lga.state?._id === stateId);
        }
        return response.data.lgas;
    },
    
    getFeeders: async () => {
        const response = await api.get("/location/all");
        return response.data.feeders;
    }
};

export default locationService;
