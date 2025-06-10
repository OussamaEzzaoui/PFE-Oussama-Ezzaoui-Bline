# Safety Report Management System


# Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Git](https://git-scm.com/)

# Configuration

1. **Clone the repository**
   
   git clone https://github.com/OussamaEzzaoui/PFE-Oussama-Ezzaoui-Bline.git
   cd PFE-Oussama-Ezzaoui-Bline
   

2. **Install dependencies**
  
   npm install


3. **Set up environment variables**
   Create a `.env` file in the root directory with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

   You can get these values from your Supabase project dashboard:
   1. Go to your Supabase project
   2. Click on "Settings" in the sidebar
   3. Click on "API" in the settings menu
   4. Copy the values from the "Project URL" and "anon public" key

4. **Set up Supabase**
   - Create a new project in [Supabase](https://supabase.com)
   - Run the migrations in the `supabase/migrations` folder
   - Enable the following features in your Supabase project:
     - Authentication
     - Storage (for image uploads)
     - Database (PostgreSQL)

# Running the Application

1. **Development mode**
   
   npm run dev
   
   This will start the development server at `http://localhost:5173`

2. **Build for production**
   
   npm run build
   

3. **Preview production build**
   
   npm run preview
   

# Features

- User authentication and authorization
- Safety report creation and management
- Action plan tracking
- Image upload and management
- PDF report generation
- Data visualization and analytics
- Role-based access control

# Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React contexts
├── lib/           # Utility functions and types
├── pages/         # Page components
└── images/        # Static images
```

# Technologies Used

- React 18
- TypeScript
- Vite
- Supabase
- Tailwind CSS
- React Router
- Chart.js
- PDF.js

# Contributing

1. Fork the repository
2. Commit your changes (`git commit -m 'Add some ...'`)
3. Push to the branch (`git push `)
4. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.