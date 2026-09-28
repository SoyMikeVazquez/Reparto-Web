const supabaseUrl = 'https://yrblfqkiyiartazyotkt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyYmxmcWtpeWlhcnRhenlvdGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNDc3NzIsImV4cCI6MjA5NTcyMzc3Mn0._SI6znYbNXfRHH7o0qYRSPlirZFV1p2LU9EHjMMKgnw';

async function test() {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseAnonKey
      },
      body: JSON.stringify({
        email: "mike.vaz3@hotmail.es",
        password: "password123", // or the actual input they had
        options: {
          data: {
            name: "Miguel",
            role: "Administrador"
          }
        }
      })
    });

    const resData = await response.json();
    console.log("Status:", response.status);
    console.log("Response Data:", JSON.stringify(resData, null, 2));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

test();
