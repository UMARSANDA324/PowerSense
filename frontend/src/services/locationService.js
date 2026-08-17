import api from "./api";

const locationService = {
    // Get complete location hierarchy (all states, LGAs, wards, feeders)
    getAll: async () => {
        const response = await api.get("location/all");
        return response.data;
    },
    
    // Get all countries and active country/state lists
    getCountries: async () => {
        const response = await api.get("location/countries");
        return response.data;
    },

    getActiveCountries: async () => {
        const response = await api.get("location/countries/active");
        return response.data;
    },

    getStates: async (countryId = null) => {
        const url = countryId ? `location/states?countryId=${countryId}` : "location/states";
        const response = await api.get(url);
        return response.data;
    },

    getActiveStates: async (countryId = null) => {
        const url = countryId ? `location/states/active?countryId=${countryId}` : "location/states/active";
        const response = await api.get(url);
        return response.data;
    },
    
    // Country & State Management (Platform Owner)
    createCountry: async (data) => {
        const response = await api.post("location/countries", data);
        return response.data;
    },

    updateCountry: async (id, data) => {
        const response = await api.put(`location/countries/${id}`, data);
        return response.data;
    },

    toggleCountryStatus: async (id, data = {}) => {
        const response = await api.patch(`location/countries/${id}/toggle-status`, data);
        return response.data;
    },

    deleteCountry: async (id) => {
        const response = await api.delete(`location/countries/${id}`);
        return response.data;
    },

    createState: async (data) => {
        const response = await api.post("location/states", data);
        return response.data;
    },

    updateState: async (id, data) => {
        const response = await api.put(`location/states/${id}`, data);
        return response.data;
    },

    toggleStateStatus: async (id, data = {}) => {
        const response = await api.patch(`location/states/${id}/toggle-status`, data);
        return response.data;
    },

    deleteState: async (id) => {
        const response = await api.delete(`location/states/${id}`);
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
        const list = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        return list.find(s => s.name === stateName);
    },
    
    // Get LGAs for a state by state name (convenience method)
    getLGAsByStateName: async (stateName) => {
        const states = await locationService.getStates();
        const list = Array.isArray(states) ? states : (states?.data || []);
        const state = list.find(s => s.name === stateName);
        if (!state) return [];
        return locationService.getLGAs(state._id);
    }
};

export default locationService;
