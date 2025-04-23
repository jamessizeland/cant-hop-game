import { IoLogoGithub } from "react-icons/io";

/**
 * Footer component that displays the link to the source code and the license.
 *
 */
const Footer = () => {
  return (
    <div className="fixed bottom-0 w-full flex justify-center p-2 items-center">
      <a
        target="_blank"
        href="https://github.com/jamessizeland/cant-hop-game"
        className="flex items-center border border-gray-200 rounded-lg p-2 shadow-md hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200 ease-in-out"
      >
        <p className="mr-3">2025</p>
        <IoLogoGithub className="h-7 w-auto" />
      </a>
    </div>
  );
};

export default Footer;
