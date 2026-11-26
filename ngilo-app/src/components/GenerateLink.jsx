import React, { useEffect, useState } from 'react';

function GenerateLink() {
    const [link, setLink] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.userId) {
            setLink(`https://ngilo.app/send${user.userId}`);
        }
    }, []);

    return (
        <div className='bg-secondary d-flex flex-column align-items-center rounded-4 p-3 w-75'>
            <h2>Your Unique Link</h2>
            {link ? (
                <>
                    <p>{link}</p>
                    <button
                        className='comp-bttn rounded-4'
                        onClick={() => {
                            navigator.clipboard.writeText(link);
                            alert('Link copied to clipboard!');
                        }}
                    >
                        Copy Link
                    </button>
                    </>
            ) : (
                <p>Loading your link...</p>
            )}
        </div>
    );
}

export default GenerateLink;