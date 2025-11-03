const Footer = () => (
  <footer className="mt-8 border-t border-gray-200 bg-white py-4">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 text-sm text-gray-500">
      <span>&copy; {new Date().getFullYear()} NIC Validation System</span>
      <span>Built with React &amp; Node.js</span>
    </div>
  </footer>
);

export default Footer;
