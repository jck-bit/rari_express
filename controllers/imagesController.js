const pool = require('../models/db');
const redisClient = require('../redis/redisClient');

const getImages = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
  
    try {
      const cachedImages = await redisClient.get(`images-page-${page}-limit-${limit}`);
      if (cachedImages) {
        return res.json(JSON.parse(cachedImages));
      }
  
      const result = await pool.query(
        'SELECT id, name, image_url, date_created FROM image ORDER BY date_created DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
  
      await redisClient.set(`images-page-${page}-limit-${limit}`, JSON.stringify(result.rows), {
        EX: 60 * 60, // Cache for 1 hour
      });
  
      res.json(result.rows);
    } catch (err) {
      console.error('Error querying the database:', err);
      res.status(500).json({ Error: "Server Error", details: err.message });
    }

  }; 

  const getImageById = async (req, res) => {
    const imageId = req.params.id;
    try {
      const result = await pool.query('SELECT * FROM image WHERE id = $1', [imageId]);
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ message: 'Image not found' });
      }
    } catch (err) {
      console.error('Error querying the database:', err);
      res.status(500).json({ error: 'Server error' });
  }
  }
  
  const getSavedImages = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(`
      SELECT image.* FROM image
      JOIN user_saved_images ON image.id = user_saved_images.image_id
      WHERE user_saved_images.user_id = $1
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error querying the database:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
  };
  
  const PostSaveImage = async (req, res) => {
  const { image_id } = req.body;
  const userId = req.user.id;
  try {
    const imageResult = await pool.query('SELECT id, name, image_url FROM image WHERE id = $1', [image_id]);
    if (imageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }
    const result = await pool.query(
      'INSERT INTO user_saved_images (user_id, image_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [userId, image_id]
    );
    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'Image already saved' });
    }
    // Invalidate the cache
    await redisClient.del('images');
    res.status(201).json({ message: 'Image saved successfully' });
  } catch (err) {
    console.error('Error saving image:', err);
    res.status(500).json({ error: 'Server error' });
  }
  };
  
  const deleteImage = async (req, res) => {
    const imageId = req.params.id;
    try {
      const result = await pool.query('DELETE FROM image WHERE id = $1 RETURNING *', [imageId]);
      if (result.rows.length > 0) {
        await redisClient.del('images')
        res.json({ message: 'Image deleted successfully', image: result.rows[0] });
      } else {
        res.status(404).json({ message: 'Image not found' });
      }
    } catch (err) {
      console.error('Error deleting the image:', err);
      res.status(500).json({ error: 'Server error' });
    }
  };
  

  module.exports = {
    getImages,
    getImageById,
    PostSaveImage,
    deleteImage,
    getSavedImages
  };