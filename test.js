const axios = require('axios')


const testEndpoint =  async() =>{
    try{
        const response = await axios.get('http://localhost:3000/images');
        console.log('Response data:', response.data);
    }catch(error){
        console.error('Error fetching the images', error)
    }
}

testEndpoint()