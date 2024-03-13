import React from 'react'
import axiosReq from "../../utils/axios";

const SignupForm = () => {

    const submitSignupForm = async (e,username,email,password,role) => {
        e.preventDefault();
        try {
            const response = await axiosReq.post("/api/register", {
                username: username,
                email: email,
                password: password,
                role: role
            }); 
            console.log("Réponse du serveur :", response.data);
        } catch (error) {
            console.error("Erreur :", error);
        }
    };
     
  return (
    <form style={{padding:'20%', paddingTop: '5%', paddingBottom:'5%'}} onSubmit={(e) => {submitSignupForm(e,'yanis', 'yanis@gmail.com','admin','user');console.log("ok psot")}}>
            <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight ">
                Create an account
            </h2>
            <div className="border-b border-gray-900/10 pb-12">
            <h2 className="text-base font-semibold leading-2 ">Personal Information</h2>
            <div className="mt-1 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div className="sm:col-span-3">
                <label htmlFor="first-name" className="block text-sm font-medium leading-6 ">
                    First name
                </label>
                <div className="mt-2">
                    <input
                    type="text"
                    name="first-name"
                    id="first-name"
                    autoComplete="given-name"
                    className="block w-full rounded-md border-0 py-1.5  shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                </div>
                </div>

                <div className="sm:col-span-3">
                <label htmlFor="last-name" className="block text-sm font-medium leading-6 ">
                    Last name
                </label>
                <div className="mt-2">
                    <input
                    type="text"
                    name="last-name"
                    id="last-name"
                    autoComplete="family-name"
                    className="block w-full rounded-md border-0 py-1.5  shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                </div>
                </div>

                <div className="sm:col-span-4">
                <label htmlFor="email" className="block text-sm font-medium leading-6 ">
                    Email address
                </label>
                <div className="mt-2">
                    <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="block w-full rounded-md border-0 py-1.5  shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                </div>
                </div>

                <div className="sm:col-span-3">
                <label htmlFor="role" className="block text-sm font-medium leading-6 ">
                    Role
                </label>
                <div className="mt-2">
                    <select
                    id="role"
                    name="role"
                    autoComplete="role-name"
                    className="block w-full rounded-md border-0 py-1.5  shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
                    >
                    <option>User</option>
                    <option>Admin</option>
                    <option>Professionnal</option>
                    </select>
                </div>
                </div>
            </div>
            </div>
      <div className="mt-6 flex items-center justify-end gap-x-6">
        <a href="/login" className="text-sm font-semibold leading-6 ">
          Cancel
        </a>
        <button
          type="submit"
          className="rounded-md bg-green-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Save
        </button>
      </div>
    </form>
  )
}

export default SignupForm;