
import api from "./api";

const locationService = {
    // Get complete location hierarchy (all states, LGAs, wards, feeders)
    getAll: async () => {
        const response = await api.get("location/all");
        return response.data;
    },
    
    // Get all states
    getStates: async () => {
        const response = await api.get("location/states");
        return response.data;
    },
    
    // Get LGAs for a specific state
    getLGAs: async (stateId) => {
        const url = stateId ? `location/lgas?stateId=${stateId}` : "location/lgas";
        const response = await api.get(url);
        return response.data;
    },
    
    // Get wards for a specific LGA
    getWards: async (lgaId) => {
        const response = await api.get(`location/wards?lgaId=${lgaId}`);
        return response.data;
    },
    
    // Get feeders for specific ward(s)
    getFeeders: async (wardIds = null) => {
        if (wardIds && wardIds.length > 0) {
            const url = `location/feeders?wardIds=${wardIds.join(',')}`;
            const response = await api.get(url);
            return response.data;
        }
        const response = await api.get("location/feeders");
        return response.data;
    },
    
    // Get state by name
    getStateByName: async (stateName) => {
        const response = await api.get("location/states");
        return response.data.find(s => s.name === stateName);
    },
    
    // Get LGAs for a state by state name (convenience method)
    getLGAsByStateName: async (stateName) => {
        const states = await this.getStates();
        const state = states.find(s => s.name === stateName);
        if (!state) return [];
        return this.getLGAs(state._id);
    }
};

export default locationService;
