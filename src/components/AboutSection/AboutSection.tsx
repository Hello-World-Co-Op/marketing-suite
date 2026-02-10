/**
 * About Section Component
 * Contains mission, vision, and information about Hello World Co-op
 */
export default function AboutSection() {
  return (
    <section id="about" className="py-16 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8">
          About Hello World Co-op
        </h2>

        <div className="space-y-6 text-lg text-slate-700 leading-relaxed">
          <p>
            <strong>Hello World Co-op</strong> is a decentralized autonomous organization (DAO)
            building a regenerative future through cooperative ownership and community-driven
            innovation.
          </p>

          <p>
            We&apos;re creating a global platform that empowers communities to democratize access to
            capital, governance, and ownership while pioneering sustainable solutions for critical
            challenges like climate change and economic inequality.
          </p>

          <div className="my-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h3>
            <p>
              To bridge digital ingenuity with tangible, regenerative impact by building
              decentralized infrastructure that safeguards integrity and compliance at every layer.
            </p>
          </div>

          <div className="my-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Why Join?</h3>
            <ul className="space-y-3 list-disc list-inside">
              <li>Be part of a global cooperative movement</li>
              <li>Participate in democratic governance (1 Member = 1 Vote)</li>
              <li>Support regenerative projects worldwide</li>
              <li>Access ethical commerce and crowdfunding platforms</li>
              <li>Learn and earn through community education programs</li>
            </ul>
          </div>

          <div className="my-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">How It Works</h3>
            <p>
              Our ecosystem consists of interconnected platforms built on the Internet Computer
              Protocol (ICP), including governance tools, crowdfunding systems, an ethical
              marketplace, and educational resources -- all powered by our community and secured by
              blockchain technology.
            </p>
          </div>

          <div className="mt-12 p-6 bg-primary-50 rounded-lg border border-primary-200">
            <p className="text-center text-primary-900 font-semibold">
              Building a Regenerative Future, Together
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
