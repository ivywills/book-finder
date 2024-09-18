import Link from "next/link";

const books = [
    {
      title: "Helgoland: Making Sense of the Quantum Revolution",
      author: "Carlo Rovelli",
      description: "Rovelli explains the quantum world in an engaging, philosophical way, exploring the observer effect and the fundamental weirdness of quantum mechanics. He ties quantum theory into broader questions of reality and existence, making it accessible to a general audience.",
      link: `https://www.amazon.ca/Helgoland-Making-Sense-Quantum-Revolution/dp/0593328892?crid=39T59BFCGNPNL&dib=eyJ2IjoiMSJ9.uHUJCzacufjBQ4T5uGYE3rDSQzT5kRc3JvoXP3yjzds.jcqPHbmNbi_Ym4wcFOWG2TJla_wBBFpR10xosWPVTuU&dib_tag=se&keywords=Helgoland%3A+Making+Sense+of+the+Quantum+Revolution&qid=1726702476&sprefix=helgoland+making+sense+of+the+quantum+revolution%2Caps%2C132&sr=8-1&linkCode=ll1&tag=bookfinderi0d-20&linkId=2ab987fcaa3d43a4e208e82fbfc08ff3&language=en_CA&ref_=as_li_ss_tl`
    },
    {
      title: "The Quantum Universe: (And Why Anything That Can Happen, Does)",
      author: "Brian Cox and Jeff Forshaw",
      description: "A great introduction to quantum mechanics for non-experts. Cox and Forshaw walk through key concepts, including wave-particle duality, superposition, and the role of the observer. They present the material clearly, with relatable examples.",
      link: `https://www.amazon.ca/Quantum-Universe-Anything-That-Happen/dp/0306821443?crid=1DAV9XTLQ8Q8N&dib=eyJ2IjoiMSJ9.2JtW-yK8qZn9CdPdobNXLS1c6-TRe4cW2uPxXB-meZHGjHj071QN20LucGBJIEps.agTIQRNGrjfLfgOkbXOHEsx9MTtb_0tSEwaRcJaG9js&dib_tag=se&keywords=The+Quantum+Universe%3A+%28And+Why+Anything+That+Can+Happen%2C+Does%29&qid=1726702868&sprefix=the+quantum+universe+and+why+anything+that+can+happen%2C+does+%2Caps%2C76&sr=8-1&linkCode=ll1&tag=bookfinderi0d-20&linkId=0d99d2dbce2bf3832958ea5226ea8571&language=en_CA&ref_=as_li_ss_tl`
    },
    {
      title: "Quantum: A Guide for the Perplexed",
      author: "Jim Al-Khalili",
      description: "Al-Khalili's book is an excellent introduction to quantum theory for those who find themselves puzzled by its strange concepts. It covers experiments like the double-slit, delayed choice, and quantum entanglement in an approachable way.",
      link: `https://www.amazon.ca/Quantum-Perplexed-Jim-Al-Khalili/dp/0297843052?crid=2VX34VBV6IO2Z&dib=eyJ2IjoiMSJ9.xytfE9PWq7R3wCm2O5WOArhjfCvgR3sBRi2OO0g3apbbD8aEamOirH5Kx44Tfgol6aUdVAFhAkWZ3e6-W9Ix_mXH85_-hblJSn4zH_JGquw.y_Hs0qUaQ0RNGJeBjk0bjNndh3jIqyWY-36wh6nw8nI&dib_tag=se&keywords=Quantum%3A+A+Guide+for+the+Perplexed+Theory&qid=1726702835&sprefix=quantum+a+guide+for+the+perplexed+theory%2Caps%2C69&sr=8-1&linkCode=ll1&tag=bookfinderi0d-20&linkId=e32fee90bd8a0a039c77b78bdc205c14&language=en_CA&ref_=as_li_ss_tl`
    },
    {
      title: "What Is Real? The Unfinished Quest for the Meaning of Quantum Physics",
      author: "Adam Becker",
      description: "This book dives into the history of quantum mechanics, exploring the debates between physicists over the meaning of the quantum world. It’s a great way to understand the observer effect and the questions that remain unresolved in quantum theory.",
      link: `https://www.amazon.ca/What-Real-Unfinished-Meaning-Quantum/dp/1541698975?crid=YHRWLV7UD7RP&dib=eyJ2IjoiMSJ9.qOJuHliyeLBoRtZle7rNMg.hN-efa47bp61TE74xkmrnMLmQBfFNkhRklfslksHqr0&dib_tag=se&keywords=What+Is+Real%3F+The+Unfinished+Quest+for+the+Meaning+of+Quantum+Physics&qid=1726702735&sprefix=what+is+real+the+unfinished+quest+for+the+meaning+of+quantum+physics%2Caps%2C109&sr=8-1&linkCode=ll1&tag=bookfinderi0d-20&linkId=b3af07b36ea4227cc2570caca371b613&language=en_CA&ref_=as_li_ss_tl`
    },
    {
      title: "The Elegant Universe: Superstrings, Hidden Dimensions, and the Quest for the Ultimate Theory",
      author: "Brian Greene",
      description: "While primarily about string theory, Greene provides a thorough explanation of quantum mechanics in the early chapters, including discussions of quantum experiments like the delayed choice. It’s accessible and written for a broad audience.",
      link: `https://www.amazon.ca/Elegant-Universe-Superstrings-Dimensions-Ultimate/dp/0393058581?crid=OUE3C4UY95Z3&dib=eyJ2IjoiMSJ9.GUUxVm1nk8MriGZN0wXsb7zWJ61cpH42uKd5vlld76hg1AFf9hqpf-dHDuSB1P1b.ieGy2Z_05e98RykYOzWyK3sYoykgfZapBH_1yf32bNg&dib_tag=se&keywords=The+Elegant+Universe%3A+Superstrings%2C+Hidden+Dimensions%2C+and+the+Quest+for+the+Ultimate+Theory&qid=1726702773&sprefix=the+elegant+universe+superstrings%2C+hidden+dimensions%2C+and+the+quest+for+the+ultimate+theory%2Caps%2C84&sr=8-1&linkCode=ll1&tag=bookfinderi0d-20&linkId=545869fbff153cef287ea6eaaf9c79ab&language=en_CA&ref_=as_li_ss_tl`
    },
    {
      title: "Quantum Physics: What Everyone Needs to Know",
      author: "Michael G. Raymer",
      description: "A concise, clear introduction to quantum physics, this book is structured as a Q&A. It touches on many of the concepts we’ve discussed, like the observer effect, quantum measurement, and the nature of time in quantum systems.",
      link: `https://www.amazon.ca/Quantum-Physics-Everyone-Needs-Know%C2%AE-ebook/dp/B071FR5316?crid=3G9S3S8BTC8FS&dib=eyJ2IjoiMSJ9.ctEDPFvSC6jkJTEloqZCntQQ_qor7x3ObxN10BeQwp-8PYx74J7mogf41anldbaVgY9Zb_Q4pPo5RC3DGhwKKXv6s2L8cCjo0V68Qf-0C1kmj41ECo-qd-nDojKImNWhtxQ3ODe5MC2_OeGGfU-zlw.72Qu9Wc7RPVQnjpYHMQnCa8Y5oNup3XhBBwBGHdWKmI&dib_tag=se&keywords=Quantum+Physics%3A+What+Everyone+Needs+to+Know&qid=1726702904&sprefix=quantum+physics+what+everyone+needs+to+know%2Caps%2C73&sr=8-1&linkCode=ll1&tag=bookfinderi0d-20&linkId=0a310d170434daa25577bca8463beacc&language=en_CA&ref_=as_li_ss_tl`
    },
  ];
  
  const Page = () => {
    return (
      <div>
        <h1 className="mt-16 lg:justify-center p-4 text-4xl font-bold">Recommended Books on Quantum Mechanics</h1>
        <ul className="lg:w-1/2 lg:justify-center">
          {books.map((book, index) => (
            <li key={index} >
              <div className="p-4">
                <h2 className="text-xl font-semibold">{book.title}</h2>
                <h3 className="text-sm text-gray-500">by {book.author}</h3>
                <p className="text-gray-700">{book.description}</p>
                <Link href={book.link}>AMAZON</Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  export default Page;